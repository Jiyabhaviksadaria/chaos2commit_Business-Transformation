import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType } from "@prisma/client"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"

export const runtime = "nodejs"

async function getModuleSpec(projectId: string, moduleKey: string) {
  const config = getDeliverableConfig(DeliverableType.SYSTEM_SPEC)
  if (!config) return null
  const deliverable = await db.deliverable.findFirst({
    where: { projectId, type: DeliverableType.SYSTEM_SPEC },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
  })
  if (!deliverable?.versions[0]) return null
  const spec = deliverable.versions[0].content as unknown as SystemSpecData
  return spec?.modules?.find(m => m.key === moduleKey) ?? null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; moduleKey: string; recordId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()

    const existing = await db.generatedRecord.findFirst({
      where: { id: params.recordId, projectId: params.projectId, moduleKey: params.moduleKey }
    })
    if (!existing) return NextResponse.json({ ok: false, error: "Record not found" }, { status: 404 })

    const mod = await getModuleSpec(params.projectId, params.moduleKey)
    const mergedData = mod ? { ...(existing.data as Record<string, unknown>), ...body } : body

    const updated = await db.generatedRecord.update({
      where: { id: params.recordId },
      data: {
        data: mergedData as import("@prisma/client").Prisma.InputJsonValue,
        updatedAt: new Date()
      }
    })

    // Activity log
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "UPDATE_RECORD",
        entity: "GeneratedRecord",
        entityId: params.recordId,
        metadata: { moduleKey: params.moduleKey }
      }
    })

    return NextResponse.json({ ok: true, data: updated })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; moduleKey: string; recordId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    await db.generatedRecord.deleteMany({
      where: { id: params.recordId, projectId: params.projectId, moduleKey: params.moduleKey }
    })
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "DELETE_RECORD",
        entity: "GeneratedRecord",
        entityId: params.recordId
      }
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
