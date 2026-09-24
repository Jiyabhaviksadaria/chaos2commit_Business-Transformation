import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { rebuildProjectContext } from "@/lib/ai/context"

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
    const status = err instanceof Error && err.name === "AuthError" ? 401 : err instanceof Error && err.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to load the document." }, { status })
  }
}

export async function DELETE(req: Request, { params }: { params: { projectId: string; docId: string } }) {
  try {
    await requireProjectAccess(params.projectId, "project:edit")

    const document = await db.document.findFirst({
      where: { id: params.docId, projectId: params.projectId },
      select: { id: true, checksum: true },
    })
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    await db.$transaction(async (tx) => {
      await tx.document.delete({ where: { id: document.id } })
      if (document.checksum) {
        await tx.intakeSource.deleteMany({ where: { projectId: params.projectId, kind: "DOCUMENT", checksum: document.checksum } })
      }
    })
    await rebuildProjectContext(params.projectId)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const status = err instanceof Error && err.name === "AuthError" ? 401 : err instanceof Error && err.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to delete the document." }, { status })
  }
}
