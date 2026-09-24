import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"
import { env } from "@/env"
import { z } from "zod"

export const runtime = "nodejs"

const ScoreCalculationSchema = z.object({
  digitalMaturity: z.number().min(0).max(100),
  aiReadiness: z.number().min(0).max(100),
  discoveryCompleteness: z.number().min(0).max(100),
  summaryReasoning: z.string(),
})

function heuristicScores(context: string, answerCount: number) {
  const length = context.trim().length
  const hasSystems = /(crm|erp|portal|system|workflow|api|database|automation)/i.test(context)
  const hasUsers = /(customer|client|employee|staff|patient|user|role)/i.test(context)
  const hasMetrics = /(target|measure|metric|volume|revenue|cost|sla|performance)/i.test(context)
  return {
    digitalMaturity: Math.min(100, Math.round(35 + Math.min(35, length / 500) + (hasSystems ? 15 : 0) + (hasUsers ? 10 : 0))),
    aiReadiness: Math.min(100, Math.round(30 + Math.min(30, length / 700) + (hasMetrics ? 20 : 0) + answerCount * 4)),
    discoveryCompleteness: Math.min(100, Math.round(25 + Math.min(45, length / 450) + answerCount * 8)),
    summaryReasoning: "Scores were calculated from the persisted source context and clarification coverage.",
  }
}

export async function POST(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const project = access.project
    const documentDelegate = (db as unknown as { project?: { findUnique?: unknown } }).project
    let context: string
    if (typeof documentDelegate?.findUnique === "function") {
      context = await buildProjectContext(params.projectId)
    } else {
      context = `${project.name}\n${project.businessGoal || ""}\n${project.businessContext || ""}`
    }
    const docCount = await db.document.count({ where: { projectId: params.projectId, status: "READY" } })

    const aiResult = await generateStructured({
      task: "score_recalculate",
      system: "You are an Enterprise Solution Diagnostic Engine. Evaluate only the supplied canonical project context. Return numeric scores from 0 to 100 and a concise evidence-based explanation. Do not use fixed defaults.",
      user: `PROJECT: ${project.name}\nDOCUMENT COUNT: ${docCount}\nPROJECT CONTEXT:\n${context}`,
      schema: ScoreCalculationSchema,
      language: project.language && project.language !== "auto" ? project.language : "en",
      userId: access.user?.id,
      organizationId: project.workspace?.organizationId,
    })

    let scores: z.infer<typeof ScoreCalculationSchema>
    if (aiResult.ok) scores = aiResult.data.data
    else if (env.AI_MOCK === "true") scores = heuristicScores(context, 0)
    else return NextResponse.json({ error: "AI readiness scoring is unavailable. Configure an AI provider and try again." }, { status: 503 })

    const updated = await db.project.update({ where: { id: params.projectId }, data: scores })
    return NextResponse.json({ digitalMaturity: updated.digitalMaturity, aiReadiness: updated.aiReadiness, discoveryCompleteness: updated.discoveryCompleteness, summaryReasoning: scores.summaryReasoning })
  } catch (error) {
    console.error("POST score recalculation failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to recalculate readiness scores." }, { status })
  }
}
