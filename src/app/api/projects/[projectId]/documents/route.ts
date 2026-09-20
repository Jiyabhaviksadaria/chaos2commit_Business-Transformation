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

// Optional summary schema
const SummarySchema = z.object({
  summary: z.string()
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
      if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
        const pdfBytes = new Uint8Array(arrayBuffer)
        const pdfRes = await extractText(pdfBytes)
        extractedText = Array.isArray(pdfRes.text) ? pdfRes.text.join("\n") : pdfRes.text
      } else if (file.name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
      } else if (file.name.endsWith(".pptx") || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        const ast = await parseOffice(buffer)
        extractedText = (await ast.to("text"))?.value || ""
      } else if (file.name.endsWith(".txt") || file.name.endsWith(".md") || file.type.startsWith("text/")) {
        extractedText = buffer.toString("utf-8")
      } else {
        throw new Error("Unsupported file format")
      }
      
      let summaryStr = ""
      if (extractedText.trim()) {
        try {
          const summaryRes = await generateStructured({
            task: "doc_summary",
            system: "You are a professional analyst summarizer. Analyze the text and return exactly a massive 5-line summary.",
            user: `TEXT TO SUMMARIZE:\n\n${extractedText.substring(0, 15000)}`,
            schema: SummarySchema,
            language: "en"
          })
          if (summaryRes.ok) {
            summaryStr = summaryRes.data.data.summary
          }
        } catch (ignored) {
           // AI failure shouldn't fail file upload
           console.warn(ignored)
        }
      }

      await db.document.update({
        where: { id: doc.id },
        data: {
          extractedText: extractedText || "No text extracted",
          summary: summaryStr || null,
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
