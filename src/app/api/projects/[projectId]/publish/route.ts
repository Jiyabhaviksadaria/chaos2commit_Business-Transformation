import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")

    const project = await db.project.findUnique({
      where: { id: params.projectId }
    })

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 })
    }

    if (!project.blueprintData) {
      return NextResponse.json(
        { ok: false, error: "Cannot publish project without an approved Master Blueprint" },
        { status: 400 }
      )
    }

    // Only allow publishing from READY_TO_DEPLOY, LIVE, or BUILDING with complete blueprint
    if (project.lifecycle === "FAILED") {
      return NextResponse.json(
        { ok: false, error: "Cannot publish project in FAILED lifecycle state" },
        { status: 400 }
      )
    }

    // 1. Enter DEPLOYING state
    await db.project.update({
      where: { id: params.projectId },
      data: { lifecycle: "DEPLOYING" }
    })

    // 2. Generate or preserve STABLE public site slug
    const cleanName = project.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30)
    const stableSlug = project.siteSlug || `${cleanName}-${params.projectId.slice(0, 8)}`

    // 3. Mark project LIVE
    const updated = await db.project.update({
      where: { id: params.projectId },
      data: {
        sitePublished: true,
        siteSlug: stableSlug,
        lifecycle: "LIVE"
      }
    })

    // 4. Activity Log
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "project_published",
        entity: "Project",
        entityId: params.projectId,
        metadata: {
          siteSlug: updated.siteSlug,
          lifecycle: updated.lifecycle
        }
      }
    })

    return NextResponse.json({
      ok: true,
      lifecycle: updated.lifecycle,
      siteSlug: updated.siteSlug
    })
  } catch (err: unknown) {
    // If deployment fails, set FAILED state
    try {
      await db.project.update({
        where: { id: params.projectId },
        data: { lifecycle: "FAILED" }
      })
    } catch {
      // ignore secondary error
    }

    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Publishing failed" },
      { status: 500 }
    )
  }
}
