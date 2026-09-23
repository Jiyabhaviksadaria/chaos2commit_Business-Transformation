import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { applyBlueprintDelta, type BlueprintDelta } from "@/lib/ai/customization-engine"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; changeId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")

    const change = await db.blueprintChange.findFirst({
      where: {
        id: params.changeId,
        projectId: params.projectId
      }
    })

    if (!change) {
      return NextResponse.json({ ok: false, error: "Blueprint change proposal not found" }, { status: 404 })
    }

    if (change.status === "APPLIED") {
      return NextResponse.json({ ok: false, error: "Change proposal has already been applied" }, { status: 400 })
    }

    if (change.status === "REJECTED") {
      return NextResponse.json({ ok: false, error: "Cannot apply a rejected change proposal" }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: params.projectId }
    })

    if (!project || !project.blueprintData) {
      return NextResponse.json({ ok: false, error: "Project or Master Blueprint missing" }, { status: 400 })
    }

    // 1. Apply Delta Deterministically to current Master Blueprint
    const updatedBlueprint = applyBlueprintDelta(project.blueprintData, change.delta as unknown as BlueprintDelta)

    // 2. Persist updated Blueprint and set lifecycle state to READY_TO_DEPLOY
    await db.project.update({
      where: { id: params.projectId },
      data: {
        blueprintData: JSON.parse(JSON.stringify(updatedBlueprint)),
        lifecycle: "READY_TO_DEPLOY"
      }
    })

    // 3. Create or update SYSTEM_SPEC Deliverable Version history
    let systemDeliverable = await db.deliverable.findFirst({
      where: { projectId: params.projectId, type: "SYSTEM_SPEC" },
      include: { versions: true }
    })

    if (!systemDeliverable) {
      systemDeliverable = await db.deliverable.create({
        data: {
          projectId: params.projectId,
          type: "SYSTEM_SPEC",
          title: "System Architecture Specification",
          status: "APPROVED"
        },
        include: { versions: true }
      })
    }

    const nextVerNum = (systemDeliverable.versions?.length || 0) + 1
    const newVersion = await db.deliverableVersion.create({
      data: {
        deliverableId: systemDeliverable.id,
        versionNumber: nextVerNum,
        content: JSON.parse(JSON.stringify(updatedBlueprint)),
        source: "AI",
        language: project.language || "en",
        createdById: access.user.id,
        note: `AI Customization: ${change.summary}`
      }
    })

    await db.deliverable.update({
      where: { id: systemDeliverable.id },
      data: { currentVersionId: newVersion.id }
    })

    // 4. Update change record status
    const updatedChange = await db.blueprintChange.update({
      where: { id: params.changeId },
      data: {
        status: "APPLIED",
        appliedAt: new Date()
      }
    })

    // 5. Activity Log
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "blueprint_change_applied",
        entity: "BlueprintChange",
        entityId: change.id,
        metadata: {
          summary: change.summary,
          versionNumber: nextVerNum
        }
      }
    })

    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "runtime_regenerated",
        entity: "Project",
        entityId: params.projectId,
        metadata: {
          summary: `Regenerated runtime modules for ${change.summary}`
        }
      }
    })

    return NextResponse.json({
      ok: true,
      change: updatedChange,
      blueprint: updatedBlueprint
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error applying blueprint change" },
      { status: 500 }
    )
  }
}
