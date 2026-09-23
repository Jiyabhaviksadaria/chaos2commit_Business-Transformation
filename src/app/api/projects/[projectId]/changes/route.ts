import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const changes = await db.blueprintChange.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ ok: true, changes })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error listing blueprint changes" },
      { status: 500 }
    )
  }
}
