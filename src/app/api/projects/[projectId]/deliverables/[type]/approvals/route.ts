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
      return NextResponse.json({ ok: true, approvals: [], deliverable: null })
    }

    const approvals = await db.approval.findMany({
      where: { deliverableId: deliverable.id },
      include: {
        requestedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewer: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      ok: true,
      deliverable,
      approvals
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/projects/[projectId]/deliverables/[type]/approvals] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch approvals" }, { status: 500 })
  }
}
