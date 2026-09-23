/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db"

export interface SendNotificationInput {
  userId: string
  type: "COMMENT" | "MENTION" | "APPROVAL" | "GENERATION_COMPLETE" | "CUSTOMIZATION" | "SYSTEM" | string
  title: string
  body: string
  link?: string
}

export async function sendNotification(input: SendNotificationInput) {
  try {
    return await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link
      }
    })
  } catch (error) {
    console.error("[sendNotification] Error creating notification:", error)
    return null
  }
}

export async function notifyProjectMembers(input: {
  projectId: string
  excludeUserId?: string
  type: string
  title: string
  body: string
  link?: string
}) {
  try {
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      include: {
        workspace: {
          include: {
            organization: {
              include: {
                memberships: true
              }
            }
          }
        }
      }
    })

    const memberships = (project as any)?.workspace?.organization?.memberships || []
    const memberIds = memberships
      .map((m: any) => m.userId)
      .filter((id: string) => id !== input.excludeUserId)

    const notifications = await Promise.all(
      memberIds.map((userId: string) =>
        sendNotification({
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link
        })
      )
    )

    return notifications.filter(Boolean)
  } catch (error) {
    console.error("[notifyProjectMembers] Error notifying members:", error)
    return []
  }
}

export async function parseAndNotifyMentions(input: {
  text: string
  authorId: string
  authorName?: string
  projectId: string
  deliverableTitle?: string
  link?: string
}) {
  try {
    const mentionRegex = /@([a-zA-Z0-9._-]+)/g
    const matches = Array.from(input.text.matchAll(mentionRegex))
    const usernamesOrEmails = Array.from(new Set(matches.map((m) => m[1])))

    if (usernamesOrEmails.length === 0) return []

    const users = await db.user.findMany({
      where: {
        OR: usernamesOrEmails.map((handle) => ({
          OR: [
            { name: { contains: handle, mode: "insensitive" } },
            { email: { contains: handle, mode: "insensitive" } },
            { id: handle }
          ]
        }))
      },
      select: { id: true, name: true, email: true }
    })

    const targetUsers = users.filter((u) => u.id !== input.authorId)
    const authorDisplayName = input.authorName || "A collaborator"
    const contextTitle = input.deliverableTitle ? ` in ${input.deliverableTitle}` : ""

    const notifications = await Promise.all(
      targetUsers.map((user) =>
        sendNotification({
          userId: user.id,
          type: "MENTION",
          title: `You were mentioned by ${authorDisplayName}`,
          body: `"${input.text.length > 120 ? input.text.slice(0, 120) + "..." : input.text}"${contextTitle}`,
          link: input.link
        })
      )
    )

    return notifications.filter(Boolean)
  } catch (error) {
    console.error("[parseAndNotifyMentions] Error parsing mentions:", error)
    return []
  }
}
