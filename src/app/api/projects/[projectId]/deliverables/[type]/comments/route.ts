/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { parseAndNotifyMentions, notifyProjectMembers } from "@/lib/notifications"

async function findDeliverable(projectId: string, typeOrId: string) {
  return await db.deliverable.findFirst({
    where: {
      projectId,
      OR: [
        { id: typeOrId },
        { type: typeOrId.toUpperCase() as any }
      ]
    },
    select: { id: true, type: true, title: true }
  })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const deliverable = await findDeliverable(params.projectId, params.type)
    if (!deliverable) {
      return NextResponse.json({ ok: true, comments: [] })
    }

    const comments = await db.comment.findMany({
      where: { deliverableId: deliverable.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return NextResponse.json({
      ok: true,
      comments
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/projects/[projectId]/deliverables/[type]/comments] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")
    const bodyJson = await req.json()
    const bodyText = bodyJson.body?.trim()

    if (!bodyText) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 })
    }

    let deliverable = await findDeliverable(params.projectId, params.type)

    if (!deliverable) {
      // If deliverable doesn't exist yet, create a placeholder record for the type
      deliverable = await db.deliverable.create({
        data: {
          projectId: params.projectId,
          type: params.type.toUpperCase() as any,
          title: params.type,
          status: "DRAFT"
        },
        select: { id: true, type: true, title: true }
      })
    }

    const comment = await db.comment.create({
      data: {
        deliverableId: deliverable.id,
        authorId: user.id,
        body: bodyText,
        resolved: false
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    const link = `/projects/${params.projectId}?tab=collaboration#comment-${comment.id}`
    const deliverableTitle = deliverable.title || deliverable.type

    // Parse and dispatch @mentions
    await parseAndNotifyMentions({
      text: bodyText,
      authorId: user.id,
      authorName: user.name || "A collaborator",
      projectId: params.projectId,
      deliverableTitle,
      link
    })

    // Notify other project members
    await notifyProjectMembers({
      projectId: params.projectId,
      excludeUserId: user.id,
      type: "COMMENT",
      title: `New comment on ${deliverableTitle}`,
      body: `"${bodyText.length > 80 ? bodyText.slice(0, 80) + "..." : bodyText}" — ${user.name || "Collaborator"}`,
      link
    })

    // Log Activity
    const orgId = project.workspace?.organizationId || "org_default"
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "comment_added",
        entity: "COMMENT",
        entityId: comment.id,
        metadata: { deliverableId: deliverable.id, deliverableType: deliverable.type }
      }
    })

    return NextResponse.json({
      ok: true,
      comment
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/deliverables/[type]/comments] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to create comment" }, { status: 500 })
  }
}
