import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"
import { z } from "zod"

const RecommendationSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
    priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    explainability: z.object({
      why: z.string(),
      contextUsed: z.string(),
      evidence: z.string(),
      assumptions: z.string(),
      alternatives: z.string(),
      expectedBenefit: z.string(),
      confidence: z.number()
    })
  }))
})

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)
    const recs = await db.recommendation.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" }
    })
    return NextResponse.json({ recommendations: recs })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const context = await buildProjectContext(params.projectId)

    const systemPrompt = `You are a Principal Business Transformation Advisor. Generate high-value feature and architectural recommendations with concise explainability.`
    const userPrompt = `Analyze this project context and generate 4 targeted recommendations:\n\n${context}`

    const aiResult = await generateStructured({
      task: "AI_RECOMMENDATIONS",
      system: systemPrompt,
      user: userPrompt,
      schema: RecommendationSchema,
      language: access.project.language,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    })

    if (!aiResult.ok) {
      return NextResponse.json({ error: aiResult.error.message }, { status: 500 })
    }

    const { recommendations } = aiResult.data.data

    const createdRecs = []
    for (const rec of recommendations) {
      const dbRec = await db.recommendation.create({
        data: {
          projectId: params.projectId,
          title: rec.title,
          description: rec.description,
          category: rec.category,
          impact: rec.impact,
          actionType: "REGENERATE_SPEC",
          actionPayload: rec.explainability as unknown as import("@prisma/client").Prisma.InputJsonValue,
          status: "PENDING"
        }
      })
      createdRecs.push(dbRec)
    }

    return NextResponse.json({ recommendations: createdRecs })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
