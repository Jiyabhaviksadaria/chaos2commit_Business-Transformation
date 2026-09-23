/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100)

    const logs = await db.activityLog.findMany({
      where: { projectId: params.projectId },
      include: {
        actor: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })

    return NextResponse.json({
      ok: true,
      activities: logs
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/projects/[projectId]/activity] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch activity logs" }, { status: 500 })
  }
}
