import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"

export const runtime = "nodejs"

const DiscoveryQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      category: z.string().describe("Domain category e.g., Operations, Integrations, Scalability, Security, Compliance"),
      question: z.string().describe("Clear, direct clarification question"),
      whyItMatters: z.string().describe("Brief explanation of why this info is crucial for architecture design"),
      suggestedAnswer: z.string().optional().describe("A helpful example or default answer recommendation")
    })
  )
})

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId)
    const project = access.project

    const documents = await db.document.findMany({
      where: { projectId: params.projectId, status: "READY" },
      select: { filename: true, summary: true }
    })

    const docSummaries = documents.map(d => `- ${d.filename}: ${d.summary || "No summary"}`).join("\n")

    const systemPrompt = `
You are a Lead Enterprise Business Analyst & Systems Architect for the Business Transformation AI platform.
Analyze the user's business goal, existing context, and documents. Identify the 4 most critical missing requirements or technical ambiguity points.
Generate high-impact clarification questions to complete the business context for architecture and PRD generation.
    `

    const userPrompt = `
PROJECT TITLE: ${project.name}
BUSINESS GOAL: ${project.businessGoal}
BUSINESS CONTEXT: ${project.businessContext || "None provided yet."}
ATTACHED DOCUMENTS:
${docSummaries || "No documents uploaded."}
    `

    const aiRes = await generateStructured({
      task: "discovery_questions",
      system: systemPrompt,
      user: userPrompt,
      schema: DiscoveryQuestionsSchema,
      language: project.language || "en"
    })

    if (!aiRes.ok) {
      return NextResponse.json({ error: aiRes.error.message }, { status: 500 })
    }

    return NextResponse.json({ questions: aiRes.data.data.questions })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
