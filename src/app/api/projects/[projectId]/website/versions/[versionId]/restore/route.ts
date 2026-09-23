/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { DeliverableType, VersionSource } from "@prisma/client"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string; versionId: string } }
) {
  try {
    const { user, project: projAccess } = await requireProjectAccess(params.projectId, "project:edit")

    const deliverable = await db.deliverable.findFirst({
      where: {
        projectId: params.projectId,
        type: DeliverableType.WEBSITE_SPEC
      },
      include: {
        project: { include: { workspace: true } },
        versions: { orderBy: { versionNumber: "desc" } }
      }
    })

    if (!deliverable) {
      return NextResponse.json({ error: "Website specification deliverable not found" }, { status: 404 })
    }

    const targetVersion = deliverable.versions.find(v => v.id === params.versionId)
    if (!targetVersion) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 })
    }

    const nextVersionNumber = (deliverable.versions[0]?.versionNumber || 0) + 1
    const changeSummary = `Restored from Version ${targetVersion.versionNumber}`

    const newVersion = await db.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: nextVersionNumber,
        content: targetVersion.content as any,
        source: VersionSource.USER_EDIT,
        language: (targetVersion.content as any)?.language || "en",
        createdById: user.id,
        note: changeSummary
      }
    })

    await db.deliverable.update({
      where: { id: deliverable.id },
      data: {
        currentVersionId: newVersion.id,
        status: "APPROVED"
      }
    })

    await db.activityLog.create({
      data: {
        organizationId: deliverable.project?.workspace?.organizationId || projAccess.workspace?.organizationId || "org_default",
        projectId: params.projectId,
        actorId: user.id,
        action: "website_version_restored",
        entity: "WEBSITE_SPEC",
        entityId: deliverable.id,
        metadata: {
          restoredFromVersion: targetVersion.versionNumber,
          newVersionNumber: nextVersionNumber
        }
      }
    })

    return NextResponse.json({
      ok: true,
      version: newVersion,
      spec: targetVersion.content
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/website/versions/[versionId]/restore] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to restore website version" }, { status: 500 })
  }
}
