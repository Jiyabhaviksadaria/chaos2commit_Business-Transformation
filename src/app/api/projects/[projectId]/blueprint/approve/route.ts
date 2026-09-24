import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const updated = await db.project.update({
      where: { id: params.projectId },
      data: { lifecycle: "BUILDING" },
    })
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "APPROVE_BLUEPRINT_AND_BUILD",
        entity: "Project",
        entityId: params.projectId,
        metadata: { lifecycle: "BUILDING" },
      },
    })
    return NextResponse.json({ success: true, lifecycle: updated.lifecycle, message: "Blueprint approved and project transitioned to BUILDING." })
  } catch (error) {
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to persist blueprint approval." }, { status })
  }
}
