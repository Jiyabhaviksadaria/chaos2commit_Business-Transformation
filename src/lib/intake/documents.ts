import { createHash } from "node:crypto"
import path from "node:path"
import mammoth from "mammoth"
import { extractText } from "unpdf"
import { parseOffice } from "officeparser"
import ExcelJS from "exceljs"
import {
  MAX_DOCUMENTS_PER_PROJECT,
  MAX_DOCUMENT_SIZE,
  MAX_TOTAL_DOCUMENTS_SIZE,
  type SupportedDocumentKind,
  type DocumentLifecycle,
  type DocumentEvidenceChunk,
  type ParsedDocumentMetadata,
  type ParsedDocument,
  type ValidatedDocument,
} from "./constants"

export {
  MAX_DOCUMENTS_PER_PROJECT,
  MAX_DOCUMENT_SIZE,
  MAX_TOTAL_DOCUMENTS_SIZE,
  type SupportedDocumentKind,
  type DocumentLifecycle,
  type DocumentEvidenceChunk,
  type ParsedDocumentMetadata,
  type ParsedDocument,
  type ValidatedDocument,
}

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


function extensionKind(filename: string): SupportedDocumentKind | null {
  const lower = filename.toLowerCase()
  const entry = (Object.entries(EXTENSIONS) as Array<[SupportedDocumentKind, string]>).find(([, ext]) => lower.endsWith(ext))
  return entry?.[0] ?? null
}

function hasExpectedSignature(kind: SupportedDocumentKind, buffer: Buffer): boolean {
  if (kind === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  if (kind === "docx" || kind === "pptx" || kind === "xlsx") {
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
  if (!kind) throw new Error("Unsupported document type. Upload PDF, DOCX, PPTX, CSV, XLSX, XLS, TXT, or MD files.")

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

/** HTML to Markdown converter for Mammoth DOCX structures */
function htmlToStructuredMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
    .replace(/<tr[^>]*>(.*?)<\/tr>/gi, (_, rowContent) => {
      const cells = (rowContent.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gi) || [])
        .map((cell: string) => cell.replace(/<[^>]+>/g, "").trim())
      return `\n| ${cells.join(" | ")} |`
    })
    .replace(/<table[^>]*>/gi, "\n")
    .replace(/<\/table>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Parses CSV text into headers, sample rows, and structured summary */
function parseCsvStructured(content: string, filename: string): { text: string; rowCount: number; columnCount: number; chunks: DocumentEvidenceChunk[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) throw new Error(`CSV file ${filename} contains no rows.`)

  const parseRow = (line: string): string[] => {
    const values: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const headers = parseRow(lines[0])
  const dataRows = lines.slice(1).map(parseRow).filter((r) => r.some((c) => c.length > 0))
  const rowCount = dataRows.length
  const columnCount = headers.length

  // Representative sample (up to 10 rows)
  const sampleRows = dataRows.slice(0, 10).map((row, idx) => {
    const formatted = headers.map((h, i) => `${h || `Col${i + 1}`}: ${row[i] || "(empty)"}`).join(", ")
    return `Row ${idx + 1}: ${formatted}`
  })

  // Detect column types
  const colTypes = headers.map((header, colIdx) => {
    let numeric = 0
    let date = 0
    const nonEmpties = dataRows.slice(0, 50).map((r) => r[colIdx]).filter(Boolean)
    for (const val of nonEmpties) {
      if (!Number.isNaN(Number(val))) numeric++
      else if (!Number.isNaN(Date.parse(val)) && val.length >= 8) date++
    }
    const sampleLen = nonEmpties.length || 1
    const detectedType = numeric / sampleLen > 0.7 ? "number" : date / sampleLen > 0.7 ? "date" : "string"
    return `${header || `Col${colIdx + 1}`} (${detectedType})`
  })

  const textBlocks: string[] = [
    `Table: ${filename}`,
    `Total Rows: ${rowCount}, Columns: ${columnCount}`,
    `Columns: [${colTypes.join(", ")}]`,
    `Sample Records (first ${sampleRows.length} rows):`,
    sampleRows.join("\n"),
  ]

  const text = textBlocks.join("\n\n")
  const chunks: DocumentEvidenceChunk[] = [
    {
      id: `${filename}-table-1`,
      filename,
      location: `Table (Rows 1-${Math.min(rowCount, 10)})`,
      content: text,
      chunkIndex: 0,
    },
  ]

  return { text, rowCount, columnCount, chunks }
}

/** Parses Excel workbook via ExcelJS, extracting sheet names, headers, counts, and samples */
async function parseExcelStructured(buffer: Buffer, filename: string): Promise<{ text: string; sheetNames: string[]; rowCount: number; columnCount: number; chunks: DocumentEvidenceChunk[] }> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

  const sheetNames: string[] = []
  let totalRows = 0
  let maxCols = 0
  const textBlocks: string[] = []
  const chunks: DocumentEvidenceChunk[] = []

  let chunkIdx = 0
  workbook.eachSheet((worksheet) => {
    const name = worksheet.name
    sheetNames.push(name)
    const rowCount = worksheet.rowCount
    const colCount = worksheet.columnCount
    totalRows += rowCount
    if (colCount > maxCols) maxCols = colCount

    const headers: string[] = []
    const firstRow = worksheet.getRow(1)
    firstRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? `Col${colNumber}`).trim()
    })

    const sampleRows: string[] = []
    const sampleLimit = Math.min(rowCount, 10)
    for (let r = 2; r <= sampleLimit + 1; r++) {
      const row = worksheet.getRow(r)
      const values: string[] = []
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1] || `Col${colNumber}`
        let valStr = ""
        if (cell.value && typeof cell.value === "object" && "result" in cell.value) {
          valStr = String(cell.value.result ?? "")
        } else if (cell.value && typeof cell.value === "object" && "text" in cell.value) {
          valStr = String(cell.value.text ?? "")
        } else {
          valStr = cell.value !== null && cell.value !== undefined ? String(cell.value) : ""
        }
        values.push(`${header}: ${valStr || "(empty)"}`)
      })
      if (values.length > 0) {
        sampleRows.push(`Row ${r - 1}: ${values.join(", ")}`)
      }
    }

    const sheetSummary = [
      `Sheet: "${name}" (Total Rows: ${rowCount}, Columns: ${colCount})`,
      `Headers: [${headers.filter(Boolean).join(", ")}]`,
      sampleRows.length > 0 ? `Representative Sample (first ${sampleRows.length} rows):\n${sampleRows.join("\n")}` : "No data rows found.",
    ].join("\n")

    textBlocks.push(sheetSummary)
    chunks.push({
      id: `${filename}-sheet-${name}`,
      filename,
      location: `Sheet: "${name}"`,
      sheetName: name,
      content: sheetSummary,
      chunkIndex: chunkIdx++,
    })
  })

  return {
    text: textBlocks.join("\n\n---\n\n"),
    sheetNames,
    rowCount: totalRows,
    columnCount: maxCols,
    chunks,
  }
}

/** Parses PPTX slides preserving slide numbers and titles */
async function parsePptxStructured(buffer: Buffer, filename: string): Promise<{ text: string; slideCount: number; chunks: DocumentEvidenceChunk[] }> {
  const ast = await parseOffice(buffer)
  const rawText = (await ast.to("text"))?.value || ""
  const normalized = normalizeText(rawText)

  // Split by common slide delimiters or double line breaks with slide markers
  const slideParts = normalized.split(/\n(?=(?:Slide \d+|--- Slide))/i)
  const chunks: DocumentEvidenceChunk[] = []
  const textBlocks: string[] = []

  if (slideParts.length > 1) {
    slideParts.forEach((part, i) => {
      const slideNum = i + 1
      const cleaned = part.trim()
      if (cleaned) {
        const slideBlock = `--- Slide ${slideNum} ---\n${cleaned}`
        textBlocks.push(slideBlock)
        chunks.push({
          id: `${filename}-slide-${slideNum}`,
          filename,
          location: `Slide ${slideNum}`,
          slideNumber: slideNum,
          content: cleaned,
          chunkIndex: i,
        })
      }
    })
  } else {
    // If officeparser produced flat text, chunk into manageable blocks
    textBlocks.push(normalized)
    chunks.push({
      id: `${filename}-slide-1`,
      filename,
      location: "Presentation Content",
      slideNumber: 1,
      content: normalized,
      chunkIndex: 0,
    })
  }

  return {
    text: textBlocks.join("\n\n"),
    slideCount: Math.max(1, chunks.length),
    chunks,
  }
}

/** Extract real text and parser metadata for every supported document type with source provenance. */
export async function parseDocument(document: ValidatedDocument): Promise<ParsedDocument> {
  let text = ""
  let pageCount: number | undefined
  let sheetNames: string[] | undefined
  let slideCount: number | undefined
  let rowCount: number | undefined
  let columnCount: number | undefined
  let isScanned = false
  let parser = "unknown"
  let parserMessages: string[] | undefined
  let chunks: DocumentEvidenceChunk[] = []

  try {
    switch (document.kind) {
      case "pdf": {
        parser = "unpdf"
        const result = await extractText(new Uint8Array(document.buffer))
        const pages: string[] = Array.isArray(result.text) ? result.text : [result.text]
        pageCount = result.totalPages || pages.length

        const pageBlocks: string[] = []
        let hasAnyText = false

        pages.forEach((pageText, idx) => {
          const pageNum = idx + 1
          const cleaned = normalizeText(pageText || "")
          if (cleaned.length > 0) {
            hasAnyText = true
            pageBlocks.push(`--- Page ${pageNum} ---\n${cleaned}`)
            chunks.push({
              id: `${document.filename}-page-${pageNum}`,
              filename: document.filename,
              location: `Page ${pageNum}`,
              pageNumber: pageNum,
              content: cleaned,
              chunkIndex: idx,
            })
          }
        })

        if (!hasAnyText) {
          isScanned = true
          throw new Error(
            `Text could not be extracted from ${document.filename}. The document appears to be scanned or image-based with no extractable text.`,
          )
        }

        text = pageBlocks.join("\n\n")
        break
      }

      case "docx": {
        parser = "mammoth"
        try {
          const htmlResult = await mammoth.convertToHtml({ buffer: document.buffer })
          if (htmlResult.messages?.length) parserMessages = htmlResult.messages.map((m) => m.message)
          text = htmlToStructuredMarkdown(htmlResult.value)
        } catch {
          const rawResult = await mammoth.extractRawText({ buffer: document.buffer })
          text = rawResult.value
        }

        text = normalizeText(text)
        if (!text) {
          throw new Error(`No readable text was found in ${document.filename}.`)
        }

        // Section-based chunking by markdown headings
        const sections = text.split(/\n(?=#+\s)/)
        sections.forEach((section, idx) => {
          const trimmed = section.trim()
          if (!trimmed) return
          const headingMatch = trimmed.match(/^#+\s+(.+)/)
          const heading = headingMatch ? headingMatch[1].trim() : `Section ${idx + 1}`
          chunks.push({
            id: `${document.filename}-section-${idx + 1}`,
            filename: document.filename,
            location: `Section: "${heading}"`,
            heading,
            content: trimmed,
            chunkIndex: idx,
          })
        })

        if (chunks.length === 0) {
          chunks.push({
            id: `${document.filename}-body`,
            filename: document.filename,
            location: "Document Body",
            content: text,
            chunkIndex: 0,
          })
        }
        break
      }

      case "xlsx": {
        parser = "exceljs"
        try {
          const excelData = await parseExcelStructured(document.buffer, document.filename)
          text = excelData.text
          sheetNames = excelData.sheetNames
          rowCount = excelData.rowCount
          columnCount = excelData.columnCount
          chunks = excelData.chunks
        } catch {
          // Fallback to officeparser if exceljs encounters a corrupted or unexpected archive
          const ast = await parseOffice(document.buffer)
          text = normalizeText((await ast.to("text"))?.value || "")
          chunks = [{
            id: `${document.filename}-dump`,
            filename: document.filename,
            location: "Spreadsheet Content",
            content: text,
            chunkIndex: 0,
          }]
        }
        break
      }

      case "xls": {
        // Legacy BIFF8 Excel binary format
        parser = "officeparser"
        const ast = await parseOffice(document.buffer)
        text = normalizeText((await ast.to("text"))?.value || "")
        chunks = [{
          id: `${document.filename}-sheet-1`,
          filename: document.filename,
          location: "Legacy Spreadsheet Content",
          content: text,
          chunkIndex: 0,
        }]
        break
      }

      case "csv": {
        parser = "csv-parser"
        const raw = document.buffer.toString("utf8")
        const parsedCsv = parseCsvStructured(raw, document.filename)
        text = parsedCsv.text
        rowCount = parsedCsv.rowCount
        columnCount = parsedCsv.columnCount
        chunks = parsedCsv.chunks
        break
      }

      case "pptx": {
        parser = "officeparser"
        const pptxData = await parsePptxStructured(document.buffer, document.filename)
        text = pptxData.text
        slideCount = pptxData.slideCount
        chunks = pptxData.chunks
        break
      }

      case "txt":
      case "md": {
        parser = "utf8"
        text = normalizeText(document.buffer.toString("utf8"))
        if (!text) throw new Error(`The text document ${document.filename} is empty.`)

        // Chunk by paragraphs or sections
        const paragraphs = text.split(/\n\n+/)
        paragraphs.forEach((p, idx) => {
          const trimmed = p.trim()
          if (!trimmed) return
          chunks.push({
            id: `${document.filename}-part-${idx + 1}`,
            filename: document.filename,
            location: `Paragraph ${idx + 1}`,
            content: trimmed,
            chunkIndex: idx,
          })
        })

        if (chunks.length === 0) {
          chunks.push({
            id: `${document.filename}-all`,
            filename: document.filename,
            location: "Text Content",
            content: text,
            chunkIndex: 0,
          })
        }
        break
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "invalid or corrupted file"
    throw new Error(
      isScanned
        ? `Text could not be extracted from ${document.filename}. The file may be an image-only/scanned PDF.`
        : `Could not extract text from ${document.filename}: ${errorMsg}`,
    )
  }

  text = normalizeText(text)
  if (!text) {
    throw new Error(`No readable text was found in ${document.filename}. The file may be empty or corrupted.`)
  }

  const metadata: ParsedDocumentMetadata = {
    filename: document.filename,
    kind: document.kind,
    sizeBytes: document.sizeBytes,
    checksum: document.checksum,
    parser,
    lifecycle: "READY",
    extractedAt: new Date().toISOString(),
    pageCount,
    sheetNames,
    slideCount,
    rowCount,
    columnCount,
    isScanned,
    chunks,
    parserMessages,
  }

  return { text, metadata }
}
