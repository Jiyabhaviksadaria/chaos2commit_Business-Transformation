import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext, updateProjectContextMetadata } from "@/lib/ai/context"
import { DeliverableType, VersionSource } from "@prisma/client"

const GenerateSchema = z.object({
  type: z.nativeEnum(DeliverableType),
  instructions: z.string().max(5_000).optional(),
  language: z.string().min(2).max(12).default("en"),
})

function normalizeSolutions(content: Record<string, unknown>): Record<string, unknown> {
  const solutions = Array.isArray(content.solutions) ? content.solutions as Array<Record<string, unknown>> : []
  return {
    ...content,
    solutions: solutions.filter((solution) => {
      const text = [solution.name, solution.description, solution.rationale, ...(Array.isArray(solution.evidence) ? solution.evidence : [])].map(String).join(" ")
      const evidence = Array.isArray(solution.evidence) ? solution.evidence.map(String).join(" ") : ""
      return !/website|web site|landing page|online presence/i.test(text) || /website|web site|landing page|online presence/i.test(evidence)
    }),
  }
}

function normalizeAnalysis(content: Record<string, unknown>): Record<string, unknown> {
  const systems = [
    ...((Array.isArray(content.recommendedSystems) ? content.recommendedSystems : []) as Array<Record<string, unknown>>),
    ...((Array.isArray(content.recommendedSolutions) ? content.recommendedSolutions : []) as Array<Record<string, unknown>>),
  ]
  const seen = new Set<string>()
  const recommendations = systems.filter((system) => {
    const name = String(system.name || system.id || "")
    const evidence = Array.isArray(system.evidence) ? system.evidence.join(" ") : String(system.evidence || "")
    const recommendationText = [name, system.description, system.rationale, system.whyRecommended, evidence].map(String).join(" ")
    const explicitlyRequested = /website|web site|landing page|online presence/i.test(evidence)
    if ((String(system.kind).toUpperCase() === "WEBSITE" || /website|web site|landing page|online presence/i.test(recommendationText)) && !explicitlyRequested) return false
    const key = name.toLowerCase()
    if (!name || seen.has(key)) return false
    seen.add(key)
    return true
  }).map((system) => ({
    ...system,
    description: system.description || system.rationale || system.whyRecommended || "",
    rationale: system.rationale || system.whyRecommended || system.description || "",
  }))

  const questions = Array.isArray(content.clarifyingQuestions) && content.clarifyingQuestions.length > 0
    ? content.clarifyingQuestions
    : (Array.isArray(content.missingInformation) ? content.missingInformation : [])
  return {
    ...content,
    recommendedSystems: recommendations,
    recommendedSolutions: recommendations,
    missingInformation: questions,
    clarifyingQuestions: questions,
  }
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "deliverable:generate")
    const body = await req.json().catch(() => ({}))
    const parse = GenerateSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 })

    const { type, instructions } = parse.data
    const language = parse.data.language === "auto" ? "en" : parse.data.language
    const config = getDeliverableConfig(type)
    if (!config) return NextResponse.json({ error: "This transformation module is not registered." }, { status: 400 })

    for (const dependency of config.dependsOn) {
      const prerequisite = await db.deliverable.findFirst({ where: { projectId: params.projectId, type: dependency }, select: { id: true } })
      if (!prerequisite) {
        return NextResponse.json({ error: `Generate ${dependency} before generating ${type}.` }, { status: 409 })
      }
    }

    const context = await buildProjectContext(params.projectId)
    const aiResult = await generateStructured({
      task: type,
      system: config.systemPrompt,
      user: config.buildUserPrompt(context, instructions),
      schema: config.outputSchema,
      language,
      mockFixture: config.mockFixture,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })
    if (!aiResult.ok) return NextResponse.json({ error: aiResult.error.message }, { status: 502 })

    const rawContent = aiResult.data.data as Record<string, unknown>
    const content = type === DeliverableType.INTAKE_ANALYSIS
      ? normalizeAnalysis(rawContent)
      : type === DeliverableType.SOLUTION_RECOMMENDATION
        ? normalizeSolutions(rawContent)
        : rawContent
    // generateStructured validates provider output against the same schema;
    // keep the normalized object as the persisted source of truth.
    const persistedContent = content as unknown as import("@prisma/client").Prisma.InputJsonValue

    const updatedDeliverable = await db.$transaction(async (tx) => {
      let deliverable = await tx.deliverable.findFirst({ where: { projectId: params.projectId, type } })
      if (!deliverable) {
        deliverable = await tx.deliverable.create({ data: { projectId: params.projectId, type, title: config.i18nTitleKey, status: "DRAFT" } })
      }
      const version = await tx.deliverableVersion.create({
        data: {
          deliverableId: deliverable.id,
          versionNumber: (await tx.deliverableVersion.count({ where: { deliverableId: deliverable.id } })) + 1,
          content: persistedContent,
          source: VersionSource.AI,
          language,
          createdById: access.user.id,
          note: instructions || "Generated from canonical project context",
        },
      })
      deliverable = await tx.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
      await tx.activityLog.create({ data: { organizationId: access.project.workspace.organizationId, projectId: params.projectId, actorId: access.user.id, action: "GENERATE_DELIVERABLE", entity: "DeliverableVersion", entityId: version.id } })
      return { deliverable, version }
    })

    if (type === DeliverableType.INTAKE_ANALYSIS) {
      const contextDelegate = (db as unknown as { projectContext?: unknown }).projectContext
      if (contextDelegate) {
        const questions = Array.isArray(content.clarifyingQuestions) ? content.clarifyingQuestions : content.missingInformation
        await updateProjectContextMetadata(params.projectId, { discoveryQuestions: questions || [] }).catch((error) => console.warn("Analysis context metadata persistence failed:", error))
      }
      await db.project.update({ where: { id: params.projectId }, data: { industry: String(content.industry || "") || null, detectedLanguage: String(content.detectedLanguage || language) } }).catch(() => undefined)
    }

    return NextResponse.json(updatedDeliverable)
  } catch (error) {
    console.error("POST deliverable generation failed:", error)
    return NextResponse.json({ error: "Unable to generate and persist this deliverable. Check the AI provider and database, then retry." }, { status: 503 })
  }
}
