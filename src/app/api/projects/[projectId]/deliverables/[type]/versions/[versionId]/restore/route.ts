/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { notifyProjectMembers } from "@/lib/notifications"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string; versionId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")

    const targetVersion = await db.deliverableVersion.findUnique({
      where: { id: params.versionId },
      include: { deliverable: true }
    })

    if (!targetVersion) {
      return NextResponse.json({ error: "Target version not found" }, { status: 404 })
    }

    const deliverable = targetVersion.deliverable

    const maxVersion = await db.deliverableVersion.findFirst({
      where: { deliverableId: deliverable.id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true }
    })

    const newVersionNumber = (maxVersion?.versionNumber || 0) + 1

    const restoredVersion = await db.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: newVersionNumber,
        content: targetVersion.content as any,
        source: "USER_EDIT",
        language: targetVersion.language || "en",
        createdById: user.id,
        note: `Restored content from version v${targetVersion.versionNumber}`
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    await db.deliverable.update({
      where: { id: deliverable.id },
      data: { currentVersionId: restoredVersion.id }
    })

    const deliverableTitle = deliverable.title || deliverable.type
    const link = `/projects/${params.projectId}?tab=versions`

    await notifyProjectMembers({
      projectId: params.projectId,
      excludeUserId: user.id,
      type: "CUSTOMIZATION",
      title: `${deliverableTitle} restored to v${targetVersion.versionNumber}`,
      body: `${user.name || "A team member"} restored ${deliverableTitle} to version v${targetVersion.versionNumber} (created new version v${restoredVersion.versionNumber}).`,
      link
    })

    const orgId = project.workspace?.organizationId || "org_default"
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "version_restored",
        entity: "DeliverableVersion",
        entityId: restoredVersion.id,
        metadata: {
          deliverableId: deliverable.id,
          deliverableType: deliverable.type,
          restoredFromVersionNumber: targetVersion.versionNumber,
          newVersionNumber: restoredVersion.versionNumber
        }
      }
    })

    return NextResponse.json({
      ok: true,
      restoredVersion
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/deliverables/[type]/versions/[versionId]/restore] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to restore version" }, { status: 500 })
  }
}
