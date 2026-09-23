import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import mammoth from "mammoth"
import { extractText } from "unpdf"
import { parseOffice } from "officeparser"
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"

// We must use Node.js runtime for parsing buffers locally
export const runtime = "nodejs"

// Document Analysis Schema
const DocumentAnalysisSchema = z.object({
  summary: z.string().describe("A 3-5 sentence executive summary of the document's main business purpose."),
  entities: z.array(z.string()).describe("Extracted key entities, companies, metrics, software tools, or domain terms."),
  metadata: z.object({
    topic: z.string().optional(),
    documentType: z.string().optional(),
    estimatedReadingTimeMinutes: z.number().optional()
  }).optional()
})

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const projectId = access.project.id

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 })
    }

    const doc = await db.document.create({
      data: {
        projectId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        status: "PENDING"
      }
    })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ""

    try {
      const filenameLower = file.name.toLowerCase()
      if (filenameLower.endsWith(".pdf") || file.type === "application/pdf") {
        const pdfBytes = new Uint8Array(arrayBuffer)
        const pdfRes = await extractText(pdfBytes)
        extractedText = Array.isArray(pdfRes.text) ? pdfRes.text.join("\n") : pdfRes.text
      } else if (filenameLower.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
      } else if (filenameLower.endsWith(".pptx") || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        const ast = await parseOffice(buffer)
        extractedText = (await ast.to("text"))?.value || ""
      } else if (filenameLower.endsWith(".csv") || file.type === "text/csv") {
        extractedText = buffer.toString("utf-8")
      } else if (filenameLower.endsWith(".xlsx") || filenameLower.endsWith(".xls") || file.type.includes("spreadsheetml")) {
        // Officeparser parses xlsx spreadsheets as text
        const ast = await parseOffice(buffer)
        extractedText = (await ast.to("text"))?.value || buffer.toString("utf-8")
      } else if (filenameLower.endsWith(".txt") || filenameLower.endsWith(".md") || file.type.startsWith("text/")) {
        extractedText = buffer.toString("utf-8")
      } else {
        // Fallback plain text read
        extractedText = buffer.toString("utf-8")
      }
      
      let summaryStr = ""
      let extractedEntities: string[] = []
      let extractedMeta: Record<string, unknown> = {}

      if (extractedText.trim()) {
        try {
          const aiRes = await generateStructured({
            task: "doc_summary",
            system: "You are an expert document intelligence assistant. Extract an executive summary, key entities, and document metadata.",
            user: `FILENAME: ${file.name}\n\nTEXT CONTENT:\n${extractedText.substring(0, 15000)}`,
            schema: DocumentAnalysisSchema,
            language: "en"
          })
          if (aiRes.ok) {
            summaryStr = aiRes.data.data.summary
            extractedEntities = aiRes.data.data.entities || []
            extractedMeta = aiRes.data.data.metadata || {}
          }
        } catch (ignored) {
          console.warn("AI analysis fallback on doc upload:", ignored)
        }
      }

      await db.document.update({
        where: { id: doc.id },
        data: {
          extractedText: extractedText || "No readable text extracted",
          summary: summaryStr || null,
          entities: JSON.stringify(extractedEntities),
          metadata: JSON.stringify(extractedMeta),
          status: "READY"
        }
      })

      return NextResponse.json({ success: true, id: doc.id })
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : "Failed to parse document"
      await db.document.update({
        where: { id: doc.id },
        data: {
          status: "FAILED",
          error: msg
        }
      })
      return NextResponse.json({ error: msg }, { status: 422 })
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId)
    const documents = await db.document.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json(documents)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
