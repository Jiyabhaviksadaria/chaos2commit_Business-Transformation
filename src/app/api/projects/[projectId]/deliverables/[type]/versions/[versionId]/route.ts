import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string; versionId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)
    const version = await db.deliverableVersion.findFirst({
      where: {
        id: params.versionId,
        deliverable: { projectId: params.projectId }
      }
    })
    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 })
    return NextResponse.json(version)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
