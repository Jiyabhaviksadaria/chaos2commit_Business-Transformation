/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const deliverable = await db.deliverable.findFirst({
      where: {
        projectId: params.projectId,
        OR: [
          { id: params.type },
          { type: params.type.toUpperCase() as any }
        ]
      }
    })

    if (!deliverable) {
      return NextResponse.json({ ok: true, versions: [], deliverable: null })
    }

    const versions = await db.deliverableVersion.findMany({
      where: { deliverableId: deliverable.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { versionNumber: "desc" }
    })

    return NextResponse.json({
      ok: true,
      deliverable,
      versions
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/projects/[projectId]/deliverables/[type]/versions] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch deliverable versions" }, { status: 500 })
  }
}
