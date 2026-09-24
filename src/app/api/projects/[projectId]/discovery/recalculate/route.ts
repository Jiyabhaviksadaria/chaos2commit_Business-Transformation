import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext, getProjectContextSnapshot, updateProjectContextMetadata } from "@/lib/ai/context"
import { assessDiscoveryState, buildReadinessAssessment } from "@/lib/ai/discovery"
import { z } from "zod"

export const runtime = "nodejs"

const ScoreCalculationSchema = z.object({
  summaryReasoning: z.string(),
})

export async function POST(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const project = access.project
    const snapshot = await getProjectContextSnapshot(params.projectId)
    const context = await buildProjectContext(params.projectId)
    const state = assessDiscoveryState({ answers: snapshot.answers, businessContent: snapshot.businessContent, metadata: snapshot.metadata, sourceCount: snapshot.sources.length })
    const readiness = buildReadinessAssessment(state, snapshot.businessContent, snapshot.metadata)
    const docCount = snapshot.sources.length

    const aiResult = await generateStructured({
      task: "readiness_explanation",
      system: "You are an Enterprise Solution Diagnostic Engine. Explain the evidence and missing information in the supplied canonical project context. Do not invent scores, evidence, or readiness. Return only a concise summary that can accompany an evidence-based assessment.",
      user: `PROJECT: ${project.name}\nSOURCE COUNT: ${docCount}\nEVIDENCE-BASED ASSESSMENT:\n${JSON.stringify(readiness)}\nPROJECT CONTEXT:\n${context}`,
      schema: ScoreCalculationSchema,
      language: project.language && project.language !== "auto" ? project.language : "en",
      userId: access.user?.id,
      organizationId: project.workspace?.organizationId,
    })

    const summaryReasoning = aiResult.ok ? aiResult.data.data.summaryReasoning : readiness.summary
    const updated = await db.project.update({
      where: { id: params.projectId },
      data: {
        readinessScore: readiness.overallScore ?? 0,
        digitalMaturity: readiness.dimensions.find((dimension) => dimension.key === "technology-readiness")?.score ?? 0,
        aiReadiness: readiness.overallScore ?? 0,
        discoveryCompleteness: state.progress,
      },
    })
    await updateProjectContextMetadata(params.projectId, { discovery: state, readiness }).catch((error) => console.warn("Readiness context persistence failed:", error))
    return NextResponse.json({ digitalMaturity: updated.digitalMaturity, aiReadiness: updated.aiReadiness, discoveryCompleteness: updated.discoveryCompleteness, summaryReasoning, readiness })
  } catch (error) {
    console.error("POST score recalculation failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to recalculate readiness scores." }, { status })
  }
}
