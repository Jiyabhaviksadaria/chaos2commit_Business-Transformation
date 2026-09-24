import { createHash } from "node:crypto"
import path from "node:path"
import mammoth from "mammoth"
import { extractText } from "unpdf"
import { parseOffice } from "officeparser"

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

export type SupportedDocumentKind = "pdf" | "docx" | "txt" | "md" | "pptx" | "csv" | "xlsx" | "xls"

const EXTENSIONS: Record<SupportedDocumentKind, string> = {
  pdf: ".pdf",
  docx: ".docx",
  txt: ".txt",
  md: ".md",
  pptx: ".pptx",
  csv: ".csv",
  xlsx: ".xlsx",
  xls: ".xls",
}

const MIME_TYPES: Record<SupportedDocumentKind, string[]> = {
  pdf: ["application/pdf", "application/octet-stream", "binary/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
  txt: ["text/plain", "text/*", "application/octet-stream"],
  md: ["text/markdown", "text/x-markdown", "text/plain", "text/*", "application/octet-stream"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream",
  ],
  csv: ["text/csv", "text/plain", "text/*", "application/octet-stream"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
}

export interface ValidatedDocument {
  filename: string
  kind: SupportedDocumentKind
  mimeType: string
  sizeBytes: number
  buffer: Buffer
  checksum: string
}

function extensionKind(filename: string): SupportedDocumentKind | null {
  const lower = filename.toLowerCase()
  const entry = (Object.entries(EXTENSIONS) as Array<[SupportedDocumentKind, string]>).find(([, ext]) => lower.endsWith(ext))
  return entry?.[0] ?? null
}

function hasExpectedSignature(kind: SupportedDocumentKind, buffer: Buffer): boolean {
  if (kind === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  if (kind === "docx" || kind === "pptx" || kind === "xlsx") {
    // OOXML files are ZIP containers. This catches renamed executables while
    // still allowing the actual parser to validate the archive structure.
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07)
  }
  if (kind === "xls") return buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1"
  return true
}

function looksBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  let suspicious = 0
  for (let index = 0; index < sample.length; index++) {
    const byte = sample[index]
    if (byte === 0) return true
    // UTF-8 text may contain high bytes, but a large number of control bytes
    // generally indicates a renamed binary file.
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious++
  }
  return sample.length > 0 && suspicious / sample.length > 0.08
}

/** Validate browser metadata and bytes before creating a database record. */
export function validateDocumentFile(file: File): ValidatedDocument {
  const filename = file.name?.trim() || ""
  if (!filename) throw new Error("A filename is required.")
  if (filename.includes("\u0000") || filename.includes("/") || filename.includes("\\") || path.basename(filename) !== filename) {
    throw new Error("Invalid filename. Path traversal is not allowed.")
  }

  const kind = extensionKind(filename)
  if (!kind) throw new Error("Unsupported document type. Upload PDF, DOCX, TXT, or MD files.")

  if (file.size <= 0) throw new Error("The uploaded document is empty.")
  if (file.size > MAX_DOCUMENT_SIZE) throw new Error("The document exceeds the 10MB size limit.")

  const mimeType = (file.type || "application/octet-stream").toLowerCase().split(";")[0].trim()
  const allowedMimes = MIME_TYPES[kind]
  const mimeAllowed = allowedMimes.some((allowed) => {
    if (allowed === "*/*") return true
    if (allowed.endsWith("/*")) return mimeType.startsWith(allowed.slice(0, -1))
    return allowed === mimeType
  })
  if (!mimeAllowed) {
    throw new Error(`The file MIME type (${mimeType}) does not match its ${kind.toUpperCase()} extension.`)
  }

  return { filename, kind, mimeType, sizeBytes: file.size, buffer: Buffer.alloc(0), checksum: "" }
}

export async function validateDocumentBytes(file: File): Promise<ValidatedDocument> {
  const basic = validateDocumentFile(file)
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length !== basic.sizeBytes || buffer.length === 0) throw new Error("The uploaded document is empty or could not be read.")
  if (!hasExpectedSignature(basic.kind, buffer)) throw new Error(`The ${basic.kind.toUpperCase()} file is corrupted or has an invalid signature.`)
  if (["txt", "md", "csv"].includes(basic.kind) && looksBinary(buffer)) {
    throw new Error("The text document contains binary data and cannot be parsed safely.")
  }

  return { ...basic, buffer, checksum: createHash("sha256").update(buffer).digest("hex") }
}

function normalizeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export interface ParsedDocument {
  text: string
  metadata: Record<string, unknown>
}

/** Extract real text and parser metadata for every supported document type. */
export async function parseDocument(document: ValidatedDocument): Promise<ParsedDocument> {
  let text = ""
  const metadata: Record<string, unknown> = {
    filename: document.filename,
    kind: document.kind,
    sizeBytes: document.sizeBytes,
    checksum: document.checksum,
  }

  try {
    switch (document.kind) {
      case "pdf": {
        const result = await extractText(new Uint8Array(document.buffer))
        text = Array.isArray(result.text) ? result.text.join("\n") : result.text
        metadata.parser = "unpdf"
        break
      }
      case "docx": {
        const result = await mammoth.extractRawText({ buffer: document.buffer })
        text = result.value
        metadata.parser = "mammoth"
        if (result.messages?.length) metadata.parserMessages = result.messages.map((message) => message.message)
        break
      }
      case "pptx":
      case "xlsx":
      case "xls": {
        const ast = await parseOffice(document.buffer)
        text = (await ast.to("text"))?.value || ""
        metadata.parser = "officeparser"
        break
      }
      case "txt":
      case "md":
      case "csv":
        text = document.buffer.toString("utf8")
        metadata.parser = "utf8"
        break
    }
  } catch (error) {
    throw new Error(`Could not extract text from ${document.filename}: ${error instanceof Error ? error.message : "invalid or corrupted file"}`)
  }

  text = normalizeText(text)
  if (!text) throw new Error(`No readable text was found in ${document.filename}. The file may be empty or corrupted.`)
  return { text, metadata }
}
