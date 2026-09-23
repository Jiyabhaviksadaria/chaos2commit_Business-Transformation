import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: { projectId: string; docId: string } }) {
  try {
    await requireProjectAccess(params.projectId)

    const document = await db.document.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

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
