import { db } from "@/lib/db"
import type { DocumentEvidenceChunk, ParsedDocumentMetadata } from "@/lib/intake/documents"

export interface NormalizedDocumentEvidence {
  id: string
  filename: string
  kind: string
  sizeBytes: number
  checksum: string | null
  status: string
  summary: string | null
  entities: string[]
  pageCount?: number
  sheetNames?: string[]
  slideCount?: number
  rowCount?: number
  columnCount?: number
  chunks: DocumentEvidenceChunk[]
  metadata: Record<string, unknown>
}

export interface UnavailableDocumentEvidence {
  id: string
  filename: string
  kind: string
  sizeBytes: number
  status: string
  error: string | null
}

export interface NormalizedProjectEvidence {
  projectId: string
  readyDocuments: NormalizedDocumentEvidence[]
  unavailableDocuments: UnavailableDocumentEvidence[]
  totalDocumentCount: number
  readyDocumentCount: number
  coveragePercentage: number
  synthesisText: string
  validSourceCitations: string[]
}

const MAX_TOTAL_EVIDENCE_CHARS = 24_000
const MAX_PER_DOC_CHARS = 6_000

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

interface DocRow {
  id: string
  filename: string
  mimeType?: string | null
  sizeBytes: number
  checksum?: string | null
  status: string
  extractedText?: string | null
  summary?: string | null
  error?: string | null
  entities?: unknown
  metadata?: unknown
}

/**
 * Builds the canonical normalized evidence layer for a project.
 * Aggregates all uploaded documents, separates ready vs unavailable files,
 * builds provenance-tagged evidence blocks, and enforces controlled context budgeting.
 */
export async function buildNormalizedProjectEvidence(projectId: string): Promise<NormalizedProjectEvidence> {
  const findManyFn = (db.document as unknown as { findMany?: (args: unknown) => Promise<DocRow[]> })?.findMany
  const rawDocuments = typeof findManyFn === "function"
    ? await findManyFn({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      })
    : []

  const documents: DocRow[] = Array.isArray(rawDocuments) ? rawDocuments : []

  const readyDocuments: NormalizedDocumentEvidence[] = []
  const unavailableDocuments: UnavailableDocumentEvidence[] = []
  const validSourceCitations: string[] = []

  for (const doc of documents) {
    const rawMeta = asRecord(doc.metadata) as Partial<ParsedDocumentMetadata>
    const extractedText = typeof doc.extractedText === "string" ? doc.extractedText : ""
    const docId = String(doc.id || "")
    const docFilename = String(doc.filename || "untitled")
    const docSizeBytes = typeof doc.sizeBytes === "number" ? doc.sizeBytes : 0
    const docStatus = String(doc.status || "UPLOADED")
    const docMimeType = doc.mimeType ? String(doc.mimeType) : undefined

    if (docStatus === "READY" && extractedText.trim()) {
      const chunks: DocumentEvidenceChunk[] = Array.isArray(rawMeta.chunks)
        ? (rawMeta.chunks as DocumentEvidenceChunk[])
        : [
            {
              id: `${docFilename}-chunk-1`,
              filename: docFilename,
              location: "Document Content",
              content: extractedText.slice(0, 4_000),
              chunkIndex: 0,
            },
          ]

      readyDocuments.push({
        id: docId,
        filename: docFilename,
        kind: String(rawMeta.kind || docMimeType || "unknown"),
        sizeBytes: docSizeBytes,
        checksum: doc.checksum ? String(doc.checksum) : null,
        status: docStatus,
        summary: doc.summary ? String(doc.summary) : null,
        entities: asStringArray(doc.entities),
        pageCount: typeof rawMeta.pageCount === "number" ? rawMeta.pageCount : undefined,
        sheetNames: Array.isArray(rawMeta.sheetNames) ? rawMeta.sheetNames.map(String) : undefined,
        slideCount: typeof rawMeta.slideCount === "number" ? rawMeta.slideCount : undefined,
        rowCount: typeof rawMeta.rowCount === "number" ? rawMeta.rowCount : undefined,
        columnCount: typeof rawMeta.columnCount === "number" ? rawMeta.columnCount : undefined,
        chunks,
        metadata: rawMeta,
      })

      // Register valid provenance citations for verification
      validSourceCitations.push(docFilename)
      chunks.forEach((chunk) => {
        if (chunk.location) {
          validSourceCitations.push(`${docFilename}, ${chunk.location}`)
        }
      })
    } else {
      unavailableDocuments.push({
        id: docId,
        filename: docFilename,
        kind: String(rawMeta.kind || docMimeType || "unknown"),
        sizeBytes: docSizeBytes,
        status: docStatus,
        error: typeof doc.error === "string" ? doc.error : "Document is not ready or has failed extraction.",
      })
    }
  }

  const total = readyDocuments.length + unavailableDocuments.length
  const ready = readyDocuments.length
  const coveragePercentage = total > 0 ? Math.round((ready / total) * 100) : 100

  // Controlled Context Synthesis
  // Calculate per-document character allowance so 1-20 documents scale smoothly
  const perDocBudget = ready > 0 ? Math.min(MAX_PER_DOC_CHARS, Math.floor(MAX_TOTAL_EVIDENCE_CHARS / ready)) : 0

  const synthesisSections: string[] = []

  if (readyDocuments.length > 0) {
    synthesisSections.push("=== NORMALIZED BUSINESS EVIDENCE FROM SUPPORTING DOCUMENTS ===")
    synthesisSections.push(`Successfully Processed: ${ready} of ${total} documents (${coveragePercentage}% coverage)`)

    readyDocuments.forEach((doc, idx) => {
      const docHeaderLines: string[] = [
        `\n--- [DOCUMENT EVIDENCE ${idx + 1}/${ready}]: "${doc.filename}" [${doc.kind.toUpperCase()}] ---`,
      ]

      if (doc.pageCount) docHeaderLines.push(`Page Count: ${doc.pageCount}`)
      if (doc.sheetNames && doc.sheetNames.length) docHeaderLines.push(`Spreadsheet Sheets: ${doc.sheetNames.join(", ")}`)
      if (doc.slideCount) docHeaderLines.push(`Slide Count: ${doc.slideCount}`)
      if (doc.rowCount) docHeaderLines.push(`Row Count: ${doc.rowCount}, Columns: ${doc.columnCount || "N/A"}`)
      if (doc.summary) docHeaderLines.push(`Executive Summary: ${doc.summary}`)
      if (doc.entities.length > 0) docHeaderLines.push(`Key Entities / Systems Mentioned: ${doc.entities.join(", ")}`)

      // Chunk synthesis with provenance citations
      const chunkBlocks: string[] = []
      let charCount = 0

      for (const chunk of doc.chunks) {
        if (charCount >= perDocBudget) break
        const availableBudget = perDocBudget - charCount
        const content = chunk.content.length <= availableBudget ? chunk.content : `${chunk.content.slice(0, availableBudget)}... [CHUNKS TRUNCATED]`
        chunkBlocks.push(`[PROVENANCE: "${doc.filename}", ${chunk.location}]\n${content}`)
        charCount += content.length
      }

      const docSection = [...docHeaderLines, "Evidence Excerpts:", chunkBlocks.join("\n\n")].join("\n")
      synthesisSections.push(docSection)
    })
  }

  if (unavailableDocuments.length > 0) {
    synthesisSections.push("\n=== UNAVAILABLE / FAILED SUPPORTING DOCUMENTS ===")
    synthesisSections.push(
      "The following uploaded documents could not be processed. Downstream business analysis may have information gaps in these functional areas:",
    )
    unavailableDocuments.forEach((u) => {
      synthesisSections.push(`- "${u.filename}" (${u.kind.toUpperCase()}): ${u.error || "Extraction failed"}`)
    })
  }

  const synthesisText = synthesisSections.join("\n\n")

  return {
    projectId,
    readyDocuments,
    unavailableDocuments,
    totalDocumentCount: total,
    readyDocumentCount: ready,
    coveragePercentage,
    synthesisText,
    validSourceCitations,
  }
}
