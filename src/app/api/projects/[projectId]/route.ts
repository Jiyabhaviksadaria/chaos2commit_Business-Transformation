import { requireProjectAccess } from "@/lib/access"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId)
    return NextResponse.json(access.project)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
