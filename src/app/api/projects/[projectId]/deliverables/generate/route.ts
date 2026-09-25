import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext, getProjectContextSnapshot, updateProjectContextMetadata } from "@/lib/ai/context"
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

const DOWNSTREAM_TRANSFORMATION_TYPES = ["REQUIREMENTS", "SYSTEM_SPEC", "SOLUTION_RECOMMENDATION", "ARCHITECTURE_HLD", "PROCESS_MAP", "WIREFRAMES", "DATABASE_DESIGN", "API_DESIGN", "ESTIMATION", "ROADMAP"]

function normalizeAnalysis(content: Record<string, unknown>, snapshotMetadata?: Record<string, unknown>): Record<string, unknown> {
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

  // Evidence coverage statistics from snapshot metadata if available
  const totalDocs = typeof snapshotMetadata?.totalDocuments === "number" ? snapshotMetadata.totalDocuments : 0
  const readyDocs = typeof snapshotMetadata?.readyDocuments === "number" ? snapshotMetadata.readyDocuments : 0
  const failedDocs = typeof snapshotMetadata?.failedDocuments === "number" ? snapshotMetadata.failedDocuments : 0
  const coveragePercentage = typeof snapshotMetadata?.evidenceCoveragePercentage === "number" ? snapshotMetadata.evidenceCoveragePercentage : 100

  const evidenceCoverage = content.evidenceCoverage && typeof content.evidenceCoverage === "object"
    ? content.evidenceCoverage
    : totalDocs > 0
      ? {
          totalDocuments: totalDocs,
          readyDocuments: readyDocs,
          unavailableDocuments: failedDocs,
          coveragePercentage,
          impactStatement: failedDocs > 0 ? `${failedDocs} document(s) failed extraction. Analysis is based on ${readyDocs} ready document(s).` : "All uploaded documents processed successfully.",
        }
      : undefined

  // Ensure facts without evidence are labeled as INFERRED or ASSUMED (Quality Gate)
  const confirmedFacts = Array.isArray(content.confirmedFacts)
    ? (content.confirmedFacts as Array<Record<string, unknown>>).map((fact) => {
        if (!fact.source || fact.source === "PROJECT_CONTEXT" || fact.source === "UNKNOWN") {
          return { ...fact, status: fact.status === "CONFIRMED" ? "INFERRED" : fact.status || "INFERRED" }
        }
        return fact
      })
    : []

  const contradictions = Array.isArray(content.contradictions) ? content.contradictions.map(String) : []
  const processBottlenecks = Array.isArray(content.processBottlenecks) ? content.processBottlenecks.map(String) : []

  return {
    ...content,
    confirmedFacts,
    contradictions,
    processBottlenecks,
    evidenceCoverage,
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

    const contextDelegate = (db as unknown as { projectContext?: unknown }).projectContext
    if (type === DeliverableType.INTAKE_ANALYSIS && contextDelegate) {
      const snapshot = await getProjectContextSnapshot(params.projectId)
      const hasStructuredCompanyContext = Boolean(snapshot.metadata.companyContext)
      const discovery = snapshot.metadata.discovery
      const discoveryRecord = discovery && typeof discovery === "object" && !Array.isArray(discovery) ? discovery as Record<string, unknown> : {}
      if (hasStructuredCompanyContext && discoveryRecord.readyForAnalysis !== true) {
        return NextResponse.json({ error: "Complete the adaptive INTELLY Discovery interview before generating Business Analysis." }, { status: 409 })
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
    let snapshotMetadata: Record<string, unknown> | undefined
    if (type === DeliverableType.INTAKE_ANALYSIS) {
      try {
        const ctxModule = await import("@/lib/ai/context")
        if (typeof ctxModule.getProjectContextSnapshot === "function") {
          const snapshot = await ctxModule.getProjectContextSnapshot(params.projectId)
          snapshotMetadata = snapshot?.metadata as Record<string, unknown> | undefined
        }
      } catch {
        // Fallback gracefully
      }
    }
    const content = type === DeliverableType.INTAKE_ANALYSIS
      ? normalizeAnalysis(rawContent, snapshotMetadata)
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
        const snapshot = await getProjectContextSnapshot(params.projectId)
        const questions = Array.isArray(content.clarifyingQuestions) ? content.clarifyingQuestions : content.missingInformation
        const previousDiscovery = snapshot.metadata.discovery && typeof snapshot.metadata.discovery === "object" && !Array.isArray(snapshot.metadata.discovery)
          ? snapshot.metadata.discovery as Record<string, unknown>
          : {}
        const understanding = {
          confirmedFacts: Array.isArray(content.confirmedFacts) ? content.confirmedFacts : previousDiscovery.understanding && typeof previousDiscovery.understanding === "object" ? (previousDiscovery.understanding as Record<string, unknown>).confirmedFacts || [] : [],
          currentProcess: Array.isArray(content.currentWorkflow) ? content.currentWorkflow : content.currentBusinessProcesses || [],
          observedProblems: Array.isArray(content.problems) ? content.problems : [],
          potentialRootCauses: Array.isArray(content.rootCauses) ? content.rootCauses : [],
          unknowns: Array.isArray(content.unknowns) ? content.unknowns : [],
          constraints: Array.isArray(content.constraints) ? content.constraints : [],
          evidence: Array.isArray(content.evidence) ? content.evidence : [],
          businessImpact: Array.isArray(content.businessImpact) ? content.businessImpact : [],
        }
        const analysisProgress = content.readiness && typeof content.readiness === "object" && !Array.isArray(content.readiness) && typeof (content.readiness as Record<string, unknown>).overallScore === "number"
          ? (content.readiness as Record<string, number>).overallScore as number
          : typeof previousDiscovery.progress === "number" ? previousDiscovery.progress : 0
        const metadataPatch: Record<string, unknown> = {
          discoveryQuestions: questions || [],
          intelligence: content,
          staleDeliverables: DOWNSTREAM_TRANSFORMATION_TYPES,
          discovery: {
            ...previousDiscovery,
            status: content.readyToBuild ? "ANALYSIS_COMPLETE" : "IN_PROGRESS",
            progress: analysisProgress,
            readyForAnalysis: Boolean(content.readyToBuild),
            understanding,
            lastUpdatedAt: new Date().toISOString(),
          },
        }
        if (content.readiness !== undefined) metadataPatch.readiness = content.readiness
        await updateProjectContextMetadata(params.projectId, metadataPatch).catch((error) => console.warn("Analysis context metadata persistence failed:", error))
      }
      await db.project.update({ where: { id: params.projectId }, data: { industry: String(content.industry || "") || null, detectedLanguage: String(content.detectedLanguage || language) } }).catch(() => undefined)
    }

    if (type !== DeliverableType.INTAKE_ANALYSIS) {
      const contextDelegate = (db as unknown as { projectContext?: unknown }).projectContext
      if (contextDelegate) {
        const snapshot = await getProjectContextSnapshot(params.projectId)
        const stale = Array.isArray(snapshot.metadata.staleDeliverables)
          ? snapshot.metadata.staleDeliverables.map(String).filter((value) => value !== type)
          : []
        await updateProjectContextMetadata(params.projectId, { staleDeliverables: stale }).catch((error) => console.warn("Stale marker update failed:", error))
      }
    }

    return NextResponse.json(updatedDeliverable)
  } catch (error) {
    console.error("POST deliverable generation failed:", error)
    return NextResponse.json({ error: "Unable to generate and persist this deliverable. Check the AI provider and database, then retry." }, { status: 503 })
  }
}
