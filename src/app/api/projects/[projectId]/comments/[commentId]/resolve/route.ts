/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; commentId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")

    const existingComment = await db.comment.findUnique({
      where: { id: params.commentId },
      include: { deliverable: true }
    })

    if (!existingComment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const newResolvedState = !existingComment.resolved

    const updatedComment = await db.comment.update({
      where: { id: params.commentId },
      data: { resolved: newResolvedState },
      include: {
        author: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    const orgId = project.workspace?.organizationId || "org_default"
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: newResolvedState ? "comment_resolved" : "comment_reopened",
        entity: "COMMENT",
        entityId: updatedComment.id,
        metadata: { deliverableId: existingComment.deliverableId, resolved: newResolvedState }
      }
    })

    return NextResponse.json({
      ok: true,
      comment: updatedComment
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/comments/[commentId]/resolve] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to toggle comment resolution" }, { status: 500 })
  }
}
