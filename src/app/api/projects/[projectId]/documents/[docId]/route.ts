import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, { params }: { params: { projectId: string; docId: string } }) {
  try {
    await requireProjectAccess(params.projectId, "project:edit")
    
    await db.document.delete({
      where: {
        id: params.docId,
        projectId: params.projectId
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
