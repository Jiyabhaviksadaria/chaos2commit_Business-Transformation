import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { updateProjectContextMetadata, upsertProjectContextAnswers } from "@/lib/ai/context"
import { assessDiscoveryState, buildReadinessAssessment } from "@/lib/ai/discovery"
import { z } from "zod"

export const runtime = "nodejs"

const AnswerSchema = z.object({
  questionId: z.string().trim().max(120).optional(),
  category: z.string().trim().min(1).max(120).default("General"),
  question: z.string().trim().min(1).max(2_000),
  answer: z.string().trim().min(1).max(10_000),
})
const AnswerBodySchema = z.object({ answers: z.array(AnswerSchema).min(1).max(6) })

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const parsed = AnswerBodySchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Provide at least one non-empty answer." }, { status: 400 })

    const answers = parsed.data.answers
    const qaFormatted = answers.map((answer) => `[${answer.category.toUpperCase()}] Q: ${answer.question}\nA: ${answer.answer}`).join("\n\n")
    const currentContext = access.project.businessContext || ""
    const contextDelegate = (db as unknown as { projectContext?: { update?: unknown } }).projectContext
    let updatedContext = currentContext
    let contextPersisted = false
    let discoveryState: ReturnType<typeof assessDiscoveryState> | null = null
    let persistedSnapshot: Awaited<ReturnType<typeof upsertProjectContextAnswers>> | null = null
    if (typeof contextDelegate?.update === "function") {
      try {
        persistedSnapshot = await upsertProjectContextAnswers(params.projectId, answers as unknown as Array<Record<string, unknown>>)
        discoveryState = assessDiscoveryState({ answers: persistedSnapshot.answers, businessContent: persistedSnapshot.businessContent, metadata: persistedSnapshot.metadata, sourceCount: persistedSnapshot.sources.length })
        contextPersisted = true
      } catch (error) {
        console.warn("Answer context persistence failed:", error)
      }
    }
    if (!contextPersisted) {
      updatedContext = `${currentContext}${currentContext ? "\n\n" : ""}--- DISCOVERY ANSWERS (${new Date().toISOString()}) ---\n${qaFormatted}`
    }

    const currentCompleteness = access.project.discoveryCompleteness ?? 0
    const newCompleteness = discoveryState?.progress ?? currentCompleteness
    const readiness = discoveryState ? buildReadinessAssessment(discoveryState, persistedSnapshot?.businessContent || currentContext, persistedSnapshot?.metadata || {}) : null
    const newDigitalMaturity = readiness?.dimensions.find((dimension) => dimension.key === "technology-readiness")?.score ?? access.project.digitalMaturity ?? 0
    const newAiReadiness = readiness?.overallScore ?? access.project.aiReadiness ?? 0
    const newReadinessScore = readiness?.overallScore ?? access.project.readinessScore ?? 0
    if (contextPersisted && discoveryState) await updateProjectContextMetadata(params.projectId, { discovery: discoveryState, readiness })

    const updatedProject = await db.project.update({
      where: { id: params.projectId },
      data: {
        businessContext: updatedContext,
        discoveryCompleteness: newCompleteness,
        readinessScore: newReadinessScore,
        digitalMaturity: newDigitalMaturity,
        aiReadiness: newAiReadiness,
      },
    })

    return NextResponse.json({
      success: true,
      savedAnswers: answers.length,
      discoveryCompleteness: updatedProject.discoveryCompleteness,
      readinessScore: updatedProject.readinessScore,
      digitalMaturity: updatedProject.digitalMaturity,
      aiReadiness: updatedProject.aiReadiness,
      businessContext: updatedProject.businessContext,
      discoveryState,
      understanding: discoveryState?.understanding || null,
    })
  } catch (error) {
    console.error("POST discovery answers failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to save discovery answers." }, { status })
  }
}
