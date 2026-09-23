import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"

export const runtime = "nodejs"

const ScoreCalculationSchema = z.object({
  digitalMaturity: z.number().min(0).max(100),
  aiReadiness: z.number().min(0).max(100),
  discoveryCompleteness: z.number().min(0).max(100),
  summaryReasoning: z.string()
})

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const project = access.project

    const docCount = await db.document.count({
      where: { projectId: params.projectId, status: "READY" }
    })

    const systemPrompt = `
You are an Enterprise Solution Diagnostic Engine. Evaluate the project's digital maturity (0-100), AI readiness (0-100), and discovery completeness (0-100) based on provided goals and context.
Return numeric scores and a 2-line reasoning summary.
    `

    const userPrompt = `
PROJECT NAME: ${project.name}
BUSINESS GOAL: ${project.businessGoal}
BUSINESS CONTEXT: ${project.businessContext || "Basic goal provided only."}
DOCUMENT COUNT: ${docCount}
    `

    const aiRes = await generateStructured({
      task: "score_recalculate",
      system: systemPrompt,
      user: userPrompt,
      schema: ScoreCalculationSchema,
      language: project.language || "en"
    })

    let digitalMaturity = 75
    let aiReadiness = 80
    let discoveryCompleteness = 70

    if (aiRes.ok) {
      digitalMaturity = aiRes.data.data.digitalMaturity
      aiReadiness = aiRes.data.data.aiReadiness
      discoveryCompleteness = aiRes.data.data.discoveryCompleteness
    }

    const updated = await db.project.update({
      where: { id: params.projectId },
      data: {
        digitalMaturity,
        aiReadiness,
        discoveryCompleteness
      }
    })

    return NextResponse.json({
      digitalMaturity: updated.digitalMaturity,
      aiReadiness: updated.aiReadiness,
      discoveryCompleteness: updated.discoveryCompleteness
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
