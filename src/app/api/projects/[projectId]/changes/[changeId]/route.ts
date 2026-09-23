import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; changeId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const change = await db.blueprintChange.findFirst({
      where: {
        id: params.changeId,
        projectId: params.projectId
      }
    })

    if (!change) {
      return NextResponse.json({ ok: false, error: "Blueprint change proposal not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, change })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error fetching change details" },
      { status: 500 }
    )
  }
}
