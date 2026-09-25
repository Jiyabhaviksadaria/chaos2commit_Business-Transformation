import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser, AccessError } from "@/lib/access"
import { reactionSchema } from "@/lib/validation/team-chat"
import { broadcastTeamChatEvent } from "@/lib/team-chat/events"
import { PlatformRole, TeamConversationType } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await requireUser()

    const message = await db.teamMessage.findUnique({
      where: { id: params.messageId },
      include: {
        conversation: {
          include: {
            workspace: {
              include: {
                organization: {
                  include: {
                    memberships: {
                      where: { userId: user.id },
                    },
                  },
                },
              },
            },
            members: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    const isPlatformAdmin = user.role === PlatformRole.PLATFORM_ADMIN
    const isOrgMember = isPlatformAdmin || message.conversation.workspace.organization.memberships.length > 0
    if (!isOrgMember) {
      throw new AccessError("You do not have access to this workspace.")
    }

    if (
      (message.conversation.isPrivate || message.conversation.type !== TeamConversationType.CHANNEL) &&
      message.conversation.members.length === 0 &&
      !isPlatformAdmin
    ) {
      throw new AccessError("You do not have access to this conversation.")
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = reactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reaction emoji." }, { status: 400 })
    }

    const emoji = parsed.data.emoji.trim()

    // Check if reaction already exists from this user
    const existing = await db.teamMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: message.id,
          userId: user.id,
          emoji,
        },
      },
    })

    if (existing) {
      // Toggle off
      await db.teamMessageReaction.delete({
        where: { id: existing.id },
      })
    } else {
      // Toggle on
      await db.teamMessageReaction.create({
        data: {
          messageId: message.id,
          userId: user.id,
          emoji,
        },
      })
    }

    // Fetch updated reactions for this message
    const allReactions = await db.teamMessageReaction.findMany({
      where: { messageId: message.id },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    const serializedReactions = allReactions.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      userId: r.userId,
      userName: r.user.name,
    }))

    broadcastTeamChatEvent({
      type: "reaction:update",
      workspaceId: message.conversation.workspaceId,
      conversationId: message.conversationId,
      payload: {
        messageId: message.id,
        conversationId: message.conversationId,
        reactions: serializedReactions,
      },
    })

    return NextResponse.json({
      success: true,
      messageId: message.id,
      reactions: serializedReactions,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/team-chat/messages/:id/reactions] Error:", error)
    return NextResponse.json({ error: "Unable to toggle reaction." }, { status: 500 })
  }
}
