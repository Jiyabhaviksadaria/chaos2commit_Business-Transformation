export const MAX_DOCUMENTS_PER_PROJECT = 20
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_TOTAL_DOCUMENTS_SIZE = 50 * 1024 * 1024 // 50MB

export type SupportedDocumentKind = "pdf" | "docx" | "txt" | "md" | "pptx" | "csv" | "xlsx" | "xls"

export type DocumentLifecycle =
  | "UPLOADED"
  | "VALIDATING"
  | "EXTRACTING"
  | "NORMALIZING"
  | "READY"
  | "EXTRACTION_FAILED"
  | "UNSUPPORTED"
  | "CORRUPTED"

export interface DocumentEvidenceChunk {
  id: string
  filename: string
  location: string
  content: string
  heading?: string
  pageNumber?: number
  sheetName?: string
  slideNumber?: number
  chunkIndex: number
}

export interface ParsedDocumentMetadata {
  filename: string
  kind: SupportedDocumentKind
  sizeBytes: number
  checksum: string
  parser: string
  lifecycle: DocumentLifecycle
  extractedAt: string
  pageCount?: number
  sheetNames?: string[]
  slideCount?: number
  rowCount?: number
  columnCount?: number
  isScanned?: boolean
  chunks: DocumentEvidenceChunk[]
  parserMessages?: string[]
  [key: string]: unknown
}

export interface ParsedDocument {
  text: string
  metadata: ParsedDocumentMetadata
}

export interface ValidatedDocument {
  filename: string
  kind: SupportedDocumentKind
  mimeType: string
  sizeBytes: number
  buffer: Buffer
  checksum: string
}
