import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"
import {
  validateDocumentBytes,
  parseDocument,
  MAX_DOCUMENT_SIZE,
  MAX_DOCUMENTS_PER_PROJECT,
  MAX_TOTAL_DOCUMENTS_SIZE,
} from "@/lib/intake/documents"
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

interface ProcessedResult {
  filename: string
  success: boolean
  id?: string
  status: "READY" | "FAILED"
  error?: string
  duplicate?: boolean
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  let activeDocumentId: string | undefined
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_TOTAL_DOCUMENTS_SIZE + 2_000_000) {
      return NextResponse.json({ error: `The upload exceeds the total limit of ${Math.round(MAX_TOTAL_DOCUMENTS_SIZE / (1024 * 1024))}MB.` }, { status: 413 })
    }

    const formData = await req.formData()
    const rawFiles: File[] = []
    if (typeof formData.getAll === "function") {
      const allFiles = [...formData.getAll("files"), ...formData.getAll("file")].filter((f): f is File => f instanceof File)
      rawFiles.push(...allFiles)
    }
    if (typeof formData.get === "function") {
      const single = formData.get("file")
      if (single instanceof File && !rawFiles.includes(single)) {
        rawFiles.push(single)
      }
    }

    // Deduplicate array references if both fields were passed
    const seenFiles = new Set<string>()
    const files: File[] = []
    for (const f of rawFiles) {
      const key = `${f.name}:${f.size}:${f.lastModified}`
      if (!seenFiles.has(key)) {
        seenFiles.add(key)
        files.push(f)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    // Check project-wide document limit (MAX_DOCUMENTS_PER_PROJECT = 20)
    const countFn = (db.document as unknown as { count?: (args: unknown) => Promise<number> })?.count
    const currentCount = typeof countFn === "function"
      ? await countFn({ where: { projectId: params.projectId } })
      : 0

    if (currentCount + files.length > MAX_DOCUMENTS_PER_PROJECT) {
      const availableSlots = Math.max(0, MAX_DOCUMENTS_PER_PROJECT - currentCount)
      return NextResponse.json(
        {
          error: `This project already has ${currentCount} documents. Adding ${files.length} document(s) would exceed the maximum limit of ${MAX_DOCUMENTS_PER_PROJECT} documents per project. (Slots remaining: ${availableSlots})`,
          limitExceeded: true,
          maxAllowed: MAX_DOCUMENTS_PER_PROJECT,
          currentCount,
          availableSlots,
        },
        { status: 422 },
      )
    }

    // Check total batch size
    const totalBatchSize = files.reduce((sum, f) => sum + f.size, 0)
    if (totalBatchSize > MAX_TOTAL_DOCUMENTS_SIZE) {
      return NextResponse.json(
        { error: `The total upload batch size exceeds the ${Math.round(MAX_TOTAL_DOCUMENTS_SIZE / (1024 * 1024))}MB limit.` },
        { status: 413 },
      )
    }

    const results: ProcessedResult[] = []
    const processedDocuments = []
    let primarySource: unknown = null

    // For single file upload, maintain strict status codes for existing contract
    const isSingle = files.length === 1

    for (const file of files) {
      activeDocumentId = undefined

      if (file.size > MAX_DOCUMENT_SIZE) {
        if (isSingle) return NextResponse.json({ error: "The document exceeds the 10MB size limit." }, { status: 413 })
        results.push({ filename: file.name, success: false, status: "FAILED", error: "The document exceeds the 10MB size limit." })
        continue
      }

      let validated
      try {
        validated = await validateDocumentBytes(file)
      } catch (valErr) {
        const msg = errorMessage(valErr, "Document validation failed.")
        if (isSingle) {
          const isInputError = /empty|unsupported|mime|filename|corrupt|size|path|signature|readable text|could not extract/i.test(msg)
          return NextResponse.json({ error: msg }, { status: isInputError ? 422 : 400 })
        }
        results.push({ filename: file.name, success: false, status: "FAILED", error: msg })
        continue
      }

      const duplicate = await db.document.findFirst({
        where: { projectId: params.projectId, checksum: validated.checksum, status: { in: ["PENDING", "READY"] } },
        select: { id: true, filename: true, status: true },
      })

      if (duplicate) {
        const msg = `This document was already uploaded as “${duplicate.filename}”.`
        if (isSingle) return NextResponse.json({ error: msg, duplicate: true }, { status: 409 })
        results.push({ filename: validated.filename, success: false, status: "FAILED", error: msg, duplicate: true })
        continue
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
      activeDocumentId = document.id

      let parsed
      try {
        parsed = await parseDocument(validated)
      } catch (parseErr) {
        const message = errorMessage(parseErr, "The document could not be parsed.")
        await db.document.update({ where: { id: document.id }, data: { status: "FAILED", error: message } })
        if (isSingle) return NextResponse.json({ error: message }, { status: 422 })
        results.push({ filename: validated.filename, success: false, id: document.id, status: "FAILED", error: message })
        continue
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
      } catch (aiErr) {
        console.warn("Document AI summarization unavailable:", aiErr)
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

      if (!primarySource) primarySource = source
      processedDocuments.push(updated)
      results.push({ filename: validated.filename, success: true, id: updated.id, status: "READY" })
    }

    const context = await rebuildProjectContext(params.projectId)

    // For single document upload, maintain the exact legacy structure
    if (isSingle && processedDocuments.length === 1) {
      const updated = processedDocuments[0]
      return NextResponse.json({
        success: true,
        id: updated.id,
        document: updated,
        source: primarySource,
        documents: processedDocuments,
        results,
        context: { sourceCount: context.sources.length, sourceTypes: context.sourceTypes },
      })
    }

    return NextResponse.json({
      success: processedDocuments.length > 0,
      documents: processedDocuments,
      results,
      readyCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      totalCount: results.length,
      context: { sourceCount: context.sources.length, sourceTypes: context.sourceTypes },
    })
  } catch (error: unknown) {
    console.error("POST document intake failed:", error)
    const message = errorMessage(error, "Unable to process the document.")
    if (activeDocumentId) {
      await db.document.update({ where: { id: activeDocumentId }, data: { status: "FAILED", error: message } }).catch(() => undefined)
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
