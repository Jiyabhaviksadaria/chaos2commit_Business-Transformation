/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { sendNotification, notifyProjectMembers } from "@/lib/notifications"
import { ApprovalStatus } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string; approvalId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")
    const bodyJson = await req.json()
    const { status, note } = bodyJson

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid approval status. Must be APPROVED or REJECTED" }, { status: 400 })
    }

    const existingApproval = await db.approval.findUnique({
      where: { id: params.approvalId },
      include: { deliverable: true }
    })

    if (!existingApproval) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 })
    }

    const targetStatus = status as ApprovalStatus
    const reviewNote = note?.trim() || (targetStatus === "APPROVED" ? "Approved." : "Changes requested.")

    const updatedApproval = await db.approval.update({
      where: { id: params.approvalId },
      data: {
        status: targetStatus,
        reviewerId: user.id,
        note: reviewNote
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewer: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    // Update deliverable status
    const deliverableNewStatus = targetStatus === "APPROVED" ? "APPROVED" : "CHANGES_REQUESTED"
    await db.deliverable.update({
      where: { id: existingApproval.deliverableId },
      data: { status: deliverableNewStatus }
    })

    const deliverableTitle = existingApproval.deliverable.title || existingApproval.deliverable.type
    const link = `/projects/${params.projectId}?tab=versions`

    // Send direct notification to requester
    if (existingApproval.requestedById !== user.id) {
      await sendNotification({
        userId: existingApproval.requestedById,
        type: "APPROVAL",
        title: `${deliverableTitle} ${targetStatus === "APPROVED" ? "Approved" : "Needs Changes"}`,
        body: `${user.name || "Reviewer"} marked ${deliverableTitle} as ${targetStatus}. Note: "${reviewNote}"`,
        link
      })
    }

    // Broadcast to project members
    await notifyProjectMembers({
      projectId: params.projectId,
      excludeUserId: user.id,
      type: "APPROVAL",
      title: `${deliverableTitle} Review Status: ${targetStatus}`,
      body: `${user.name || "Reviewer"} updated review status for ${deliverableTitle} to ${targetStatus}.`,
      link
    })

    // Log Activity
    const orgId = project.workspace?.organizationId || "org_default"
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: targetStatus === "APPROVED" ? "approval_granted" : "approval_rejected",
        entity: "Approval",
        entityId: updatedApproval.id,
        metadata: {
          deliverableId: existingApproval.deliverableId,
          status: targetStatus,
          note: reviewNote
        }
      }
    })

    return NextResponse.json({
      ok: true,
      approval: updatedApproval
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/deliverables/[type]/approvals/[approvalId]] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to process review action" }, { status: 500 })
  }
}
