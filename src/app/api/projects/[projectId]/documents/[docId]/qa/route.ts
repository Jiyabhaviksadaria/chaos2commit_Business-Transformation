import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateText } from "@/lib/ai/orchestrator"
import { z } from "zod"

export const runtime = "nodejs"

const QaBodySchema = z.object({
  question: z.string().min(1, "Question cannot be empty")
})

export async function POST(req: Request, { params }: { params: { projectId: string; docId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId)
    
    const json = await req.json()
    const parsed = QaBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const { question } = parsed.data

    const document = await db.document.findFirst({
      where: {
        id: params.docId,
        projectId: params.projectId
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const docContext = `
DOCUMENT TITLE: ${document.filename}
DOCUMENT SUMMARY: ${document.summary || "N/A"}
EXTRACTED CONTENT:
${(document.extractedText || "").substring(0, 12000)}
    `

    const systemPrompt = `
You are an expert Document Intelligence Analyst for the Business Transformation AI platform.
Answer the user's question accurately using ONLY the provided document context.
If the answer is not contained within the document context, state that clearly and offer a logical business deduction based on the available text.
Be concise, clear, and professional.
    `

    const aiRes = await generateText({
      task: "doc_qa",
      system: systemPrompt,
      user: `DOCUMENT CONTEXT:\n${docContext}\n\nUSER QUESTION:\n${question}`,
      language: access.project.language || "en"
    })

    if (!aiRes.ok) {
      return NextResponse.json({ error: aiRes.error }, { status: 500 })
    }

    return NextResponse.json({ answer: aiRes.data.text })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
