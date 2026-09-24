import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"
import { validateDocumentBytes, parseDocument, MAX_DOCUMENT_SIZE } from "@/lib/intake/documents"
import { rebuildProjectContext } from "@/lib/ai/context"

export const runtime = "nodejs"

const DocumentAnalysisSchema = z.object({
  summary: z.string().describe("A concise executive summary of the document's business purpose."),
  entities: z.array(z.string()).describe("Key entities, companies, metrics, software tools, or domain terms."),
  metadata: z.object({
    topic: z.string().optional(),
    documentType: z.string().optional(),
    estimatedReadingTimeMinutes: z.number().optional(),
  }).optional(),
})

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  let documentId: string | undefined
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_DOCUMENT_SIZE + 1_000_000) return NextResponse.json({ error: "The document exceeds the 10MB size limit." }, { status: 413 })
    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 })
    if (file.size > MAX_DOCUMENT_SIZE) return NextResponse.json({ error: "The document exceeds the 10MB size limit." }, { status: 413 })

    const validated = await validateDocumentBytes(file)
    const duplicate = await db.document.findFirst({
      where: { projectId: params.projectId, checksum: validated.checksum, status: { in: ["PENDING", "READY"] } },
      select: { id: true, filename: true, status: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: `This document was already uploaded as “${duplicate.filename}”.`, duplicate: true }, { status: 409 })
    }

    const document = await db.document.create({
      data: {
        projectId: params.projectId,
        filename: validated.filename,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        checksum: validated.checksum,
        status: "PENDING",
      },
    })
    documentId = document.id

    let parsed
    try {
      parsed = await parseDocument(validated)
    } catch (error) {
      const message = errorMessage(error, "The document could not be parsed.")
      await db.document.update({ where: { id: document.id }, data: { status: "FAILED", error: message } })
      return NextResponse.json({ error: message }, { status: 422 })
    }

    let summary: string | null = null
    let entities: string[] = []
    let aiMetadata: Record<string, unknown> = {}
    try {
      const aiResult = await generateStructured({
        task: "document_intake",
        system: "You are a document intelligence analyst. Extract a factual business summary and key entities from the supplied text. Do not invent facts.",
        user: `FILENAME: ${validated.filename}\n\nEXTRACTED TEXT:\n${parsed.text.slice(0, 20_000)}`,
        schema: DocumentAnalysisSchema,
        language: access.project.language || "en",
        userId: access.user.id,
        organizationId: access.project.workspace.organizationId,
      })
      if (aiResult.ok) {
        summary = aiResult.data.data.summary
        entities = aiResult.data.data.entities || []
        aiMetadata = aiResult.data.data.metadata || {}
      }
    } catch (error) {
      // Extraction is the source of truth. An unavailable AI summarizer must
      // not turn a valid document into a failed upload.
      console.warn("Document AI summarization unavailable:", error)
    }

    const metadata = { ...parsed.metadata, ...aiMetadata, extractedAt: new Date().toISOString() }
    const updated = await db.document.update({
      where: { id: document.id },
      data: {
        extractedText: parsed.text,
        summary,
        entities: entities as unknown as import("@prisma/client").Prisma.InputJsonValue,
        metadata: metadata as unknown as import("@prisma/client").Prisma.InputJsonValue,
        status: "READY",
        error: null,
      },
    })

    const source = await db.intakeSource.create({
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
    const context = await rebuildProjectContext(params.projectId)

    return NextResponse.json({
      success: true,
      id: updated.id,
      document: updated,
      source,
      context: { sourceCount: context.sources.length, sourceTypes: context.sourceTypes },
    })
  } catch (error: unknown) {
    console.error("POST document intake failed:", error)
    const message = errorMessage(error, "Unable to process the document.")
    if (documentId) {
      await db.document.update({ where: { id: documentId }, data: { status: "FAILED", error: message } }).catch(() => undefined)
    }
    const isInputError = /empty|unsupported|mime|filename|corrupt|size|path|signature|readable text|could not extract/i.test(message)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : isInputError ? 422 : 503
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId)
    const documents = await db.document.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(documents)
  } catch (err: unknown) {
    console.error("GET documents failed:", err)
    const status = err instanceof Error && err.name === "AuthError" ? 401 : err instanceof Error && err.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to load documents right now." }, { status })
  }
}
