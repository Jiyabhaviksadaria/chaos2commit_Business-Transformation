import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

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
      return NextResponse.json({ ok: false, error: "Cannot reject an already applied change" }, { status: 400 })
    }

    const updated = await db.blueprintChange.update({
      where: { id: params.changeId },
      data: { status: "REJECTED" }
    })

    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "blueprint_change_rejected",
        entity: "BlueprintChange",
        entityId: change.id,
        metadata: { summary: change.summary }
      }
    })

    return NextResponse.json({ ok: true, change: updated })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error rejecting change proposal" },
      { status: 500 }
    )
  }
}
