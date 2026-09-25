import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { validateDocumentBytes, parseDocument, MAX_DOCUMENT_SIZE } from "@/lib/intake/documents"
import { rebuildProjectContext } from "@/lib/ai/context"

export const runtime = "nodejs"

export async function POST(req: Request, { params }: { params: { projectId: string; docId: string } }) {
  try {
    await requireProjectAccess(params.projectId, "project:edit")
    const existing = await db.document.findFirst({
      where: { id: params.docId, projectId: params.projectId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 })
    }

    const formData = await req.formData().catch(() => null)
    const file = formData?.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Provide a replacement file to retry extraction for this document." },
        { status: 400 },
      )
    }

    if (file.size > MAX_DOCUMENT_SIZE) {
      return NextResponse.json({ error: "The document exceeds the 10MB size limit." }, { status: 413 })
    }

    const validated = await validateDocumentBytes(file)
    const parsed = await parseDocument(validated)

    const metadata = {
      ...parsed.metadata,
      retriedAt: new Date().toISOString(),
    }

    const updated = await db.document.update({
      where: { id: existing.id },
      data: {
        filename: validated.filename,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        checksum: validated.checksum,
        extractedText: parsed.text,
        metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
        status: "READY",
        error: null,
      },
    })

    // Upsert or create intake source
    const existingSource = await db.intakeSource.findFirst({
      where: { projectId: params.projectId, kind: "DOCUMENT", label: existing.filename },
    })

    if (existingSource) {
      await db.intakeSource.update({
        where: { id: existingSource.id },
        data: {
          label: validated.filename,
          mimeType: validated.mimeType,
          sizeBytes: validated.sizeBytes,
          checksum: validated.checksum,
          extractedText: parsed.text,
          metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
          status: "READY",
          error: null,
        },
      })
    } else {
      await db.intakeSource.create({
        data: {
          projectId: params.projectId,
          kind: "DOCUMENT",
          label: validated.filename,
          mimeType: validated.mimeType,
          sizeBytes: validated.sizeBytes,
          checksum: validated.checksum,
          extractedText: parsed.text,
          metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
          status: "READY",
        },
      })
    }

    const context = await rebuildProjectContext(params.projectId)

    return NextResponse.json({
      success: true,
      document: updated,
      context: { sourceCount: context.sources.length, sourceTypes: context.sourceTypes },
    })
  } catch (error: unknown) {
    console.error("POST document retry failed:", error)
    const message = error instanceof Error ? error.message : "Unable to retry document processing."
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
