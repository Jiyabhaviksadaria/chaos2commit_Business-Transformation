import { db } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { formatCompanyContext } from "@/lib/company-context"

const MAX_SOURCE_TEXT = 12_000
const DEFAULT_CONTEXT_BUDGET = 15_000

export interface ProjectContextSource {
  id: string
  kind: string
  label: string
  url?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  checksum?: string | null
  status: string
  createdAt?: string | Date | null
  metadata?: unknown
  extractedText: string
}

export interface ProjectContextSnapshot {
  projectId: string
  sources: ProjectContextSource[]
  extractedText: string
  businessContent: string
  metadata: Record<string, unknown>
  sourceTypes: string[]
  answers: Array<Record<string, unknown>>
  updatedAt: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asAnswers(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : []
}

function formatStructuredMetadata(metadata: Record<string, unknown>): string {
  const companyContext = formatCompanyContext(metadata.companyContext)
  const discovery = asRecord(metadata.discovery)
  const intelligence = asRecord(metadata.intelligence)
  const discoveryLines = [
    discovery.status ? `Discovery status: ${String(discovery.status)}` : "",
    typeof discovery.progress === "number" ? `Discovery progress: ${discovery.progress}%` : "",
    discovery.readyForAnalysis === true ? "INTELLY has enough information to analyze the transformation." : "",
  ].filter(Boolean)
  const understanding = asRecord(discovery.understanding)
  const intelligenceLines = [
    typeof intelligence.businessSummary === "string" ? `Current business understanding: ${intelligence.businessSummary}` : "",
    Array.isArray(intelligence.problems) && intelligence.problems.length ? `Observed problems: ${JSON.stringify(intelligence.problems)}` : "",
    Array.isArray(intelligence.rootCauses) && intelligence.rootCauses.length ? `Potential root causes: ${JSON.stringify(intelligence.rootCauses)}` : "",
    Array.isArray(intelligence.unknowns) && intelligence.unknowns.length ? `Unknowns requiring validation: ${JSON.stringify(intelligence.unknowns)}` : "",
    Array.isArray(understanding.currentProcess) && understanding.currentProcess.length ? `Discovery current process: ${JSON.stringify(understanding.currentProcess)}` : "",
    Array.isArray(understanding.observedProblems) && understanding.observedProblems.length ? `Discovery observed problems: ${JSON.stringify(understanding.observedProblems)}` : "",
    Array.isArray(understanding.potentialRootCauses) && understanding.potentialRootCauses.length ? `Discovery potential root causes: ${JSON.stringify(understanding.potentialRootCauses)}` : "",
    Array.isArray(understanding.evidence) && understanding.evidence.length ? `Discovery evidence: ${JSON.stringify(understanding.evidence)}` : "",
  ].filter(Boolean)
  const readiness = asRecord(metadata.readiness)
  const readinessLines = readiness.status ? `Readiness state: ${String(readiness.status)}${typeof readiness.overallScore === "number" ? ` (${readiness.overallScore}%)` : ""}` : ""
  return [companyContext, discoveryLines.join("\n"), intelligenceLines.join("\n"), readinessLines].filter(Boolean).join("\n\n")
}

function normalize(value: string): string {
  return value.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

function sourceText(value: string): string {
  const text = normalize(value)
  if (text.length <= MAX_SOURCE_TEXT) return text
  const headLength = Math.floor(MAX_SOURCE_TEXT / 2)
  const tailLength = MAX_SOURCE_TEXT - headLength
  return `${text.slice(0, headLength)}\n...[TRUNCATED]...\n${text.slice(-tailLength)}`
}

function buildSources(project: Record<string, unknown>): ProjectContextSource[] {
  const sources: ProjectContextSource[] = []
  const seen = new Set<string>()

  const intakeSources = Array.isArray(project.intakeSources) ? project.intakeSources : []
  for (const raw of intakeSources) {
    const source = raw as Record<string, unknown>
    const text = typeof source.extractedText === "string" ? source.extractedText : ""
    if (source.status !== "READY" || !text.trim()) continue
    const key = `${String(source.kind || "UNKNOWN")}:${String(source.checksum || source.url || source.label)}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push({
      id: String(source.id || key),
      kind: String(source.kind || "UNKNOWN"),
      label: String(source.label || "Intake source"),
      url: typeof source.url === "string" ? source.url : null,
      mimeType: typeof source.mimeType === "string" ? source.mimeType : null,
      sizeBytes: typeof source.sizeBytes === "number" ? source.sizeBytes : null,
      checksum: typeof source.checksum === "string" ? source.checksum : null,
      status: String(source.status || "READY"),
      createdAt: source.createdAt instanceof Date
        ? source.createdAt.toISOString()
        : typeof source.createdAt === "string" ? source.createdAt : null,
      metadata: source.metadata ?? null,
      extractedText: sourceText(text),
    })
  }

  // Backwards-compatible projects created before IntakeSource was introduced
  // still have Document rows. Include them, while de-duplicating document
  // sources that have already been mirrored into IntakeSource.
  const documents = Array.isArray(project.documents) ? project.documents : []
  for (const raw of documents) {
    const document = raw as Record<string, unknown>
    const text = typeof document.extractedText === "string" ? document.extractedText : ""
    if (document.status !== "READY" || !text.trim()) continue
    const checksum = typeof document.checksum === "string" ? document.checksum : null
    const key = `DOCUMENT:${checksum || document.id || document.filename}`
    if (seen.has(key)) continue
    seen.add(key)
    sources.push({
      id: String(document.id || key),
      kind: "DOCUMENT",
      label: String(document.filename || "Uploaded document"),
      url: null,
      mimeType: typeof document.mimeType === "string" ? document.mimeType : null,
      sizeBytes: typeof document.sizeBytes === "number" ? document.sizeBytes : null,
      checksum,
      status: String(document.status || "READY"),
      createdAt: document.createdAt instanceof Date
        ? document.createdAt.toISOString()
        : typeof document.createdAt === "string" ? document.createdAt : null,
      metadata: document.metadata ?? null,
      extractedText: sourceText(text),
    })
  }

  return sources
}

function serializeDeliverables(project: Record<string, unknown>): string {
  const deliverables = Array.isArray(project.deliverables) ? project.deliverables : []
  const lines: string[] = []
  for (const raw of deliverables) {
    const deliverable = raw as Record<string, unknown>
    const type = String(deliverable.type || "DELIVERABLE")
    // Website specifications are owned by the separate Website Builder. They
    // must not silently become a business-analysis recommendation or source.
    if (type === "WEBSITE_SPEC") continue
    const versions = Array.isArray(deliverable.versions) ? deliverable.versions : []
    const latest = versions[0] as Record<string, unknown> | undefined
    if (!latest || !latest.content) continue
    lines.push(`DELIVERABLE ${type} (${String(deliverable.title || type)}):\n${JSON.stringify(latest.content)}`)
  }
  return lines.join("\n\n")
}

/** Assemble a context snapshot from persisted sources and structured outputs. */
export async function rebuildProjectContext(projectId: string): Promise<ProjectContextSnapshot> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      documents: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
      intakeSources: { where: { status: "READY" }, orderBy: { createdAt: "asc" } },
      deliverables: {
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        orderBy: { updatedAt: "desc" },
      },
      projectContext: true,
    },
  } as never) as Record<string, unknown> | null

  if (!project) throw new Error("Project context not found.")

  const existingContext = asRecord(project.projectContext)
  const existingMetadata = asRecord(existingContext.metadata)
  const sources = buildSources(project)
  const sourceTypes = Array.from(new Set(sources.map((source) => source.kind)))
  const sourceTextBlocks = sources.map((source) => `SOURCE: ${source.label} [${source.kind}]\n${source.extractedText}`)
  const extractedText = sourceTextBlocks.join("\n\n").trim()
  const persistedAnswers = asAnswers(existingContext.answers)
  const answerContext = persistedAnswers.length > 0
    ? `Persisted discovery answers:\n${persistedAnswers.map((answer) => `Q: ${String(answer.question || "")}\nA: ${String(answer.answer || "")}`).join("\n\n")}`
    : ""
  const businessContent = normalize([
    `Project: ${String(project.name || "Untitled project")}`,
    project.industry ? `Industry: ${String(project.industry)}` : "",
    project.businessGoal ? `Project source summary: ${String(project.businessGoal)}` : "",
    formatStructuredMetadata(existingMetadata),
    typeof project.businessContext === "string" ? project.businessContext : "",
    answerContext,
    project.blueprintData ? `Persisted Master Blueprint:\n${JSON.stringify(project.blueprintData)}` : "",
    extractedText,
    serializeDeliverables(project),
  ].filter(Boolean).join("\n\n"))

  const metadata = {
    ...existingMetadata,
    projectName: project.name || null,
    projectIndustry: project.industry || null,
    sourceCount: sources.length,
    builtAt: new Date().toISOString(),
  }
  const answers = persistedAnswers
  const snapshot: ProjectContextSnapshot = {
    projectId,
    sources,
    extractedText,
    businessContent,
    metadata,
    sourceTypes,
    answers,
    updatedAt: new Date().toISOString(),
  }

  // Persist the canonical snapshot. The dynamic guard keeps lightweight unit
  // test doubles and older generated clients from breaking context reads.
  const contextDelegate = (db as unknown as {
    projectContext?: {
      upsert: (args: unknown) => Promise<unknown>
    }
  }).projectContext
  if (contextDelegate?.upsert) {
    await contextDelegate.upsert({
      where: { projectId },
      create: {
        projectId,
        sources: snapshot.sources as unknown as Prisma.InputJsonValue,
        extractedText: snapshot.extractedText,
        businessContent: snapshot.businessContent,
        metadata: snapshot.metadata as Prisma.InputJsonValue,
        sourceTypes: snapshot.sourceTypes as Prisma.InputJsonValue,
        answers: snapshot.answers as Prisma.InputJsonValue,
      },
      update: {
        sources: snapshot.sources as unknown as Prisma.InputJsonValue,
        extractedText: snapshot.extractedText,
        businessContent: snapshot.businessContent,
        metadata: snapshot.metadata as Prisma.InputJsonValue,
        sourceTypes: snapshot.sourceTypes as Prisma.InputJsonValue,
        answers: snapshot.answers as Prisma.InputJsonValue,
      },
    })
  }

  // Keep the legacy field useful for older consumers, but never use it as a
  // replacement for the unified source snapshot.
  const projectUpdate = (db as unknown as { project?: { update?: (args: unknown) => Promise<unknown> } }).project
  const hasStructuredCompanyContext = Boolean(existingMetadata.companyContext)
  if (projectUpdate?.update && !project.businessContext && !hasStructuredCompanyContext) {
    await projectUpdate.update({ where: { id: projectId }, data: { businessContext: businessContent } })
  }

  return snapshot
}

export async function getProjectContextSnapshot(projectId: string): Promise<ProjectContextSnapshot> {
  return rebuildProjectContext(projectId)
}

/** Merge metadata into the persisted context without re-ingesting sources. */
export async function updateProjectContextMetadata(projectId: string, patch: Record<string, unknown>): Promise<ProjectContextSnapshot> {
  const snapshot = await rebuildProjectContext(projectId)
  const metadata = { ...snapshot.metadata, ...patch, updatedAt: new Date().toISOString() }
  const delegate = (db as unknown as {
    projectContext?: { update?: (args: unknown) => Promise<unknown> }
  }).projectContext
  if (delegate?.update) {
    await delegate.update({ where: { projectId }, data: { metadata: metadata as Prisma.InputJsonValue } })
  }
  return { ...snapshot, metadata }
}

/** Persist clarification answers once; duplicate submissions are idempotent. */
export async function appendProjectContextAnswers(projectId: string, incoming: Array<Record<string, unknown>>): Promise<ProjectContextSnapshot> {
  const snapshot = await rebuildProjectContext(projectId)
  const existing = snapshot.answers
  const existingKeys = new Set(existing.map((answer) => `${answer.questionId || ""}:${answer.question || ""}:${answer.answer || ""}`))
  const additions = incoming.filter((answer) => {
    const key = `${answer.questionId || ""}:${answer.question || ""}:${answer.answer || ""}`
    if (existingKeys.has(key)) return false
    existingKeys.add(key)
    return true
  })
  const answers = [...existing, ...additions]
  const delegate = (db as unknown as {
    projectContext?: { update?: (args: unknown) => Promise<unknown> }
  }).projectContext
  if (delegate?.update) {
    await delegate.update({ where: { projectId }, data: { answers: answers as Prisma.InputJsonValue } })
  }
  return { ...snapshot, answers }
}

export async function upsertProjectContextAnswers(projectId: string, incoming: Array<Record<string, unknown>>): Promise<ProjectContextSnapshot> {
  const snapshot = await rebuildProjectContext(projectId)
  const answers = [...snapshot.answers]
  for (const answer of incoming) {
    const questionId = String(answer.questionId || "")
    const question = String(answer.question || "")
    const index = answers.findIndex((existing) => {
      const existingId = String(existing.questionId || "")
      const existingQuestion = String(existing.question || "")
      return (questionId && existingId === questionId) || (!questionId && existingQuestion === question)
    })
    if (index >= 0) answers[index] = { ...answers[index], ...answer, updatedAt: new Date().toISOString() }
    else answers.push({ ...answer, createdAt: new Date().toISOString() })
  }
  const discovery = asRecord(snapshot.metadata.discovery)
  const staleDeliverables = Array.from(new Set([
    ...(Array.isArray(snapshot.metadata.staleDeliverables) ? snapshot.metadata.staleDeliverables.map(String) : []),
    "REQUIREMENTS",
    "SYSTEM_SPEC",
    "SOLUTION_RECOMMENDATION",
    "ARCHITECTURE_HLD",
    "PROCESS_MAP",
    "WIREFRAMES",
    "DATABASE_DESIGN",
    "API_DESIGN",
    "ESTIMATION",
    "ROADMAP",
  ]))
  const metadata = {
    ...snapshot.metadata,
    discovery: {
      ...discovery,
      answers,
      lastUpdatedAt: new Date().toISOString(),
    },
    staleDeliverables,
    updatedAt: new Date().toISOString(),
  }
  const delegate = (db as unknown as {
    projectContext?: { update?: (args: unknown) => Promise<unknown> }
  }).projectContext
  if (delegate?.update) {
    await delegate.update({
      where: { projectId },
      data: {
        answers: answers as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    })
  }
  return { ...snapshot, answers, metadata }
}

function formatUserContext(metadata: Record<string, unknown>): string {
  const userContext = asRecord(metadata.userContext)
  const name = typeof userContext.name === "string" ? userContext.name.trim() : ""
  const companyRole = typeof userContext.companyRole === "string" ? userContext.companyRole.trim() : ""
  const intakeRole = typeof userContext.intakeRole === "string" ? userContext.intakeRole.trim() : ""
  const effectiveRole = companyRole || intakeRole
  if (!name && !effectiveRole) return ""

  return [
    "--- USER CONTEXT (PERSON USING THE PLATFORM) ---",
    name ? `Name: ${name}` : "",
    effectiveRole ? `Role in Company: ${effectiveRole}` : "",
    intakeRole && intakeRole !== companyRole ? `Intake role: ${intakeRole}` : "",
  ].filter(Boolean).join("\n")
}

function formatSnapshot(snapshot: ProjectContextSnapshot, project: Record<string, unknown>, budget: number): string {
  const userContext = formatUserContext(snapshot.metadata)
  const header = [
    `Project Name: ${String(project.name || "Untitled project")}`,
    project.industry ? `Industry: ${String(project.industry)}` : "",
    project.businessGoal ? `Source Summary: ${String(project.businessGoal)}` : "",
    userContext,
    "",
    "--- UNIFIED PROJECT CONTEXT ---",
    snapshot.businessContent,
  ].filter(Boolean).join("\n")

  if (header.length <= budget) return header
  const marker = "\n...[PROJECT CONTEXT TRUNCATED]..."
  return `${header.slice(0, Math.max(0, budget - marker.length))}${marker}`
}

/**
 * Read the one canonical context used by every AI stage. This function never
 * scrapes or parses a source independently; ingestion owns that work.
 */
export async function buildProjectContext(projectId: string, budgetLimitChars = DEFAULT_CONTEXT_BUDGET): Promise<string> {
  const snapshot = await getProjectContextSnapshot(projectId)
  const project = (await db.project.findUnique({ where: { id: projectId } } as never)) as Record<string, unknown> | null
  if (!project) return "Project context not found."
  return formatSnapshot(snapshot, project, Math.max(1_000, budgetLimitChars))
}
