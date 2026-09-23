/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { notifyProjectMembers } from "@/lib/notifications"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")
    const bodyJson = await req.json().catch(() => ({}))
    const requestNote = bodyJson.note?.trim() || "Requested review and sign-off."

    let deliverable = await db.deliverable.findFirst({
      where: {
        projectId: params.projectId,
        OR: [
          { id: params.type },
          { type: params.type.toUpperCase() as any }
        ]
      }
    })

    if (!deliverable) {
      deliverable = await db.deliverable.create({
        data: {
          projectId: params.projectId,
          type: params.type.toUpperCase() as any,
          title: params.type,
          status: "IN_REVIEW"
        }
      })
    } else {
      await db.deliverable.update({
        where: { id: deliverable.id },
        data: { status: "IN_REVIEW" }
      })
    }

    const approval = await db.approval.create({
      data: {
        deliverableId: deliverable.id,
        requestedById: user.id,
        status: "PENDING",
        note: requestNote
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewer: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    const deliverableTitle = deliverable.title || deliverable.type
    const link = `/projects/${params.projectId}?tab=versions`

    await notifyProjectMembers({
      projectId: params.projectId,
      excludeUserId: user.id,
      type: "APPROVAL",
      title: `Review Requested: ${deliverableTitle}`,
      body: `${user.name || "A team member"} requested formal sign-off on ${deliverableTitle}. Note: "${requestNote}"`,
      link
    })

    const orgId = project.workspace?.organizationId || "org_default"
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "approval_requested",
        entity: "Approval",
        entityId: approval.id,
        metadata: { deliverableId: deliverable.id, deliverableType: deliverable.type, note: requestNote }
      }
    })

    return NextResponse.json({
      ok: true,
      approval
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/deliverables/[type]/approvals/request] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to request approval" }, { status: 500 })
  }
}
