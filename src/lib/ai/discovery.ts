import { z } from "zod"

export const EvidenceStatusSchema = z.enum(["CONFIRMED", "INFERRED", "ASSUMED", "UNKNOWN"])
export const EvidenceSourceTypeSchema = z.enum(["USER", "URL", "DOCUMENT", "SYSTEM", "UNKNOWN"])

export const DiscoveryEvidenceSchema = z.object({
  id: z.string().optional(),
  statement: z.string(),
  source: z.string().default("PROJECT_CONTEXT"),
  sourceType: EvidenceSourceTypeSchema.default("UNKNOWN"),
  status: EvidenceStatusSchema.default("UNKNOWN"),
  confidence: z.number().min(0).max(100).default(0),
})

export const DiscoveryProblemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().default(""),
  status: EvidenceStatusSchema.default("INFERRED"),
  confidence: z.number().min(0).max(100).default(0),
  evidenceIds: z.array(z.string()).default([]),
})

export const DiscoveryRootCauseSchema = z.object({
  id: z.string().optional(),
  problemId: z.string().optional(),
  statement: z.string(),
  underlyingCause: z.string().default(""),
  systemOrProcessCause: z.string().default(""),
  status: EvidenceStatusSchema.default("INFERRED"),
  confidence: z.number().min(0).max(100).default(0),
  evidenceIds: z.array(z.string()).default([]),
})

export const DiscoveryQuestionSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  reason: z.string().default(""),
  whyItMatters: z.string().default(""),
  rationale: z.string().default(""),
  suggestedAnswers: z.array(z.string()).default([]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  informationValue: z.number().min(0).max(100).default(0),
  evidenceRefs: z.array(z.string()).default([]),
  status: z.enum(["OPEN", "ANSWERED", "SKIPPED"]).default("OPEN"),
})

export const DiscoveryUnderstandingSchema = z.object({
  confirmedFacts: z.array(DiscoveryEvidenceSchema).default([]),
  currentProcess: z.array(z.string()).default([]),
  observedProblems: z.array(DiscoveryProblemSchema).default([]),
  potentialRootCauses: z.array(DiscoveryRootCauseSchema).default([]),
  unknowns: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([]),
  evidence: z.array(DiscoveryEvidenceSchema).default([]),
  businessImpact: z.array(z.string()).default([]),
})

export const DiscoveryInterviewSchema = z.object({
  questions: z.array(DiscoveryQuestionSchema).max(6).default([]),
  understanding: DiscoveryUnderstandingSchema,
  readyForAnalysis: z.boolean().default(false),
  confidence: z.number().min(0).max(100).default(0),
  nextFocus: z.string().default(""),
})

export type DiscoveryQuestion = z.infer<typeof DiscoveryQuestionSchema>
export type DiscoveryUnderstanding = z.infer<typeof DiscoveryUnderstandingSchema>
export type DiscoveryInterview = z.infer<typeof DiscoveryInterviewSchema>

export const DISCOVERY_DIMENSIONS = [
  "Business objective",
  "Current process",
  "Observed problem",
  "Evidence",
  "Business impact",
  "Constraints",
] as const

export type DiscoveryDimension = (typeof DISCOVERY_DIMENSIONS)[number]

export interface DiscoveryState {
  status: "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_ANALYSIS" | "ANALYSIS_COMPLETE"
  progress: number
  readyForAnalysis: boolean
  confidence: number
  questions: DiscoveryQuestion[]
  understanding: DiscoveryUnderstanding
  lastUpdatedAt: string
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map(textFromUnknown).join(" ")
  if (value && typeof value === "object") return JSON.stringify(value)
  return ""
}

function hasAnswerEvidence(answers: Array<Record<string, unknown>>, terms: RegExp): boolean {
  return answers.some((answer) => terms.test(textFromUnknown(answer.answer)))
}

export function emptyUnderstanding(): DiscoveryUnderstanding {
  return {
    confirmedFacts: [],
    currentProcess: [],
    observedProblems: [],
    potentialRootCauses: [],
    unknowns: [],
    constraints: [],
    evidence: [],
    businessImpact: [],
  }
}

export function reconcileDiscoveryQuestions(questions: DiscoveryQuestion[], answers: Array<Record<string, unknown>>): DiscoveryQuestion[] {
  const answered = new Set(answers.map((answer) => `${String(answer.questionId || "")}::${String(answer.question || "")}`))
  return questions.filter((question) => {
    const key = `${question.id}::${question.question}`
    return !answered.has(key) && question.status !== "ANSWERED" && question.status !== "SKIPPED"
  })
}

export function emptyDiscoveryState(): DiscoveryState {
  return {
    status: "NOT_STARTED",
    progress: 0,
    readyForAnalysis: false,
    confidence: 0,
    questions: [],
    understanding: emptyUnderstanding(),
    lastUpdatedAt: new Date().toISOString(),
  }
}

export function assessDiscoveryState(input: {
  answers?: Array<Record<string, unknown>>
  businessContent?: string
  metadata?: Record<string, unknown>
  sourceCount?: number
}): DiscoveryState {
  const answers = input.answers || []
  const content = input.businessContent || ""
  const metadata = input.metadata || {}
  const existing = metadata.discovery && typeof metadata.discovery === "object" && !Array.isArray(metadata.discovery)
    ? metadata.discovery as Record<string, unknown>
    : {}
  const structuredCompanyContext = metadata.companyContext && typeof metadata.companyContext === "object" && !Array.isArray(metadata.companyContext)
    ? metadata.companyContext as Record<string, unknown>
    : {}
  const hasStructuredObjective = typeof structuredCompanyContext.businessObjective === "string" && structuredCompanyContext.businessObjective.trim().length > 0
  const storedUnderstanding = existing.understanding && typeof existing.understanding === "object" && !Array.isArray(existing.understanding)
    ? existing.understanding as Partial<DiscoveryUnderstanding>
    : {}
  const understanding: DiscoveryUnderstanding = {
    ...emptyUnderstanding(),
    ...storedUnderstanding,
    confirmedFacts: Array.isArray(storedUnderstanding.confirmedFacts) ? storedUnderstanding.confirmedFacts : [],
    currentProcess: Array.isArray(storedUnderstanding.currentProcess) ? storedUnderstanding.currentProcess : [],
    observedProblems: Array.isArray(storedUnderstanding.observedProblems) ? storedUnderstanding.observedProblems : [],
    potentialRootCauses: Array.isArray(storedUnderstanding.potentialRootCauses) ? storedUnderstanding.potentialRootCauses : [],
    unknowns: Array.isArray(storedUnderstanding.unknowns) ? storedUnderstanding.unknowns : [],
    constraints: Array.isArray(storedUnderstanding.constraints) ? storedUnderstanding.constraints : [],
    evidence: Array.isArray(storedUnderstanding.evidence) ? storedUnderstanding.evidence : [],
    businessImpact: Array.isArray(storedUnderstanding.businessImpact) ? storedUnderstanding.businessImpact : [],
  }

  const dimensions: Record<DiscoveryDimension, boolean> = {
    "Business objective": hasStructuredObjective || /objective|goal|success|outcome/i.test(content),
    "Current process": understanding.currentProcess.length > 0 || hasAnswerEvidence(answers, /process|workflow|step|manual|currently|how .* work/i) || /current process|workflow|steps?/i.test(content),
    "Observed problem": understanding.observedProblems.length > 0 || hasAnswerEvidence(answers, /problem|issue|error|slow|manual|discrep|pain|fail/i) || /problem|pain point|issue|error/i.test(content),
    Evidence: understanding.evidence.length > 0 || (input.sourceCount || 0) > 0 || answers.length > 0,
    "Business impact": understanding.businessImpact.length > 0 || hasAnswerEvidence(answers, /impact|cost|lost|revenue|customer|employee|sales|discrep/i) || /business impact|financial impact|customer impact/i.test(content),
    Constraints: understanding.constraints.length > 0 || hasAnswerEvidence(answers, /budget|timeline|compliance|privacy|constraint|legacy|skill/i) || /constraint|budget|timeline|compliance/i.test(content),
  }
  const evidencedDimensions = DISCOVERY_DIMENSIONS.filter((dimension) => dimensions[dimension]).length
  const progress = Math.round((evidencedDimensions / DISCOVERY_DIMENSIONS.length) * 100)
  const answerConfidence = answers.length === 0 ? 0 : Math.min(100, Math.round(35 + answers.length * 8))
  const existingConfidence = typeof existing.confidence === "number" ? existing.confidence : 0
  const existingAnswerCount = Array.isArray(existing.answers) ? existing.answers.length : 0
  const preserveAnalysisComplete = existing.status === "ANALYSIS_COMPLETE" && existingAnswerCount === answers.length
  const readyForAnalysis = Boolean(
    answers.length >= 3 &&
    dimensions["Business objective"] &&
    dimensions["Current process"] &&
    dimensions["Observed problem"] &&
    dimensions.Evidence &&
    dimensions["Business impact"] &&
    dimensions.Constraints,
  )

  return {
    status: preserveAnalysisComplete ? "ANALYSIS_COMPLETE" : readyForAnalysis ? "READY_FOR_ANALYSIS" : answers.length > 0 || (input.sourceCount || 0) > 0 ? "IN_PROGRESS" : "NOT_STARTED",
    progress,
    readyForAnalysis,
    confidence: Math.max(answerConfidence, existingConfidence),
    questions: Array.isArray(existing.questions) ? existing.questions as DiscoveryQuestion[] : [],
    understanding,
    lastUpdatedAt: new Date().toISOString(),
  }
}

export const ReadinessDimensionSchema = z.object({
  key: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100).nullable(),
  explanation: z.string(),
  evidence: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
})

export const ReadinessAssessmentSchema = z.object({
  status: z.enum(["READY", "INSUFFICIENT_INFORMATION"]),
  overallScore: z.number().min(0).max(100).nullable(),
  evidenceBased: z.boolean(),
  dimensions: z.array(ReadinessDimensionSchema),
  summary: z.string(),
})

export type ReadinessAssessment = z.infer<typeof ReadinessAssessmentSchema>

export function buildReadinessAssessment(state: DiscoveryState, businessContent: string, metadata: Record<string, unknown>): ReadinessAssessment {
  const understanding = state.understanding
  const evidence = understanding.evidence.map((item) => item.statement)
  const companyContext = metadata.companyContext && typeof metadata.companyContext === "object" && !Array.isArray(metadata.companyContext)
    ? metadata.companyContext as Record<string, unknown>
    : {}
  const coverage = (values: string[], target: number) => values.length ? Math.min(100, Math.round((values.length / target) * 100)) : null
  const objectiveEvidence = [
    ...(typeof companyContext.businessObjective === "string" && companyContext.businessObjective.trim() ? [companyContext.businessObjective.trim()] : []),
    ...understanding.confirmedFacts.map((fact) => fact.statement),
  ]
  const technologyEvidence = [
    ...(Array.isArray(companyContext.currentTools) ? companyContext.currentTools.map(String) : []),
    ...evidence.filter((item) => /system|api|integration|software|platform|legacy/i.test(item)),
  ]
  const integrationEvidence = evidence.filter((item) => /integrat|api|interface|sync|exchange|webhook/i.test(item))
  const organizationalEvidence = understanding.confirmedFacts.map((fact) => fact.statement)
  const dimensions: Array<z.infer<typeof ReadinessDimensionSchema>> = [
    {
      key: "business-clarity",
      label: "Business Clarity",
      score: coverage(objectiveEvidence, 2),
      explanation: objectiveEvidence.length ? "Structured objective and confirmed business context are present." : "No explicit objective evidence is available.",
      evidence: objectiveEvidence,
      missingInformation: objectiveEvidence.length ? [] : ["Clarify the measurable business objective and success outcome."],
    },
    {
      key: "process-understanding",
      label: "Process Understanding",
      score: coverage(understanding.currentProcess, 2),
      explanation: understanding.currentProcess.length ? "The current workflow has been described." : "The current process is not sufficiently documented.",
      evidence: understanding.currentProcess,
      missingInformation: understanding.currentProcess.length ? [] : ["Document the current process, actors, handoffs, and systems."],
    },
    {
      key: "data-readiness",
      label: "Data Readiness",
      score: coverage(evidence, 2),
      explanation: evidence.length ? "Traceable evidence has been recorded for the current understanding." : "No traceable evidence has been recorded yet.",
      evidence,
      missingInformation: evidence.length ? [] : ["Provide source or user evidence for the key problem."],
    },
    {
      key: "technology-readiness",
      label: "Technology Readiness",
      score: coverage(technologyEvidence, 2),
      explanation: technologyEvidence.length ? "Current systems or technology context is evidenced." : "Technology constraints and integration boundaries are not evidenced.",
      evidence: technologyEvidence,
      missingInformation: technologyEvidence.length ? [] : ["Clarify current systems, integration points, and technical constraints."],
    },
    {
      key: "integration-readiness",
      label: "Integration Readiness",
      score: coverage(integrationEvidence, 1),
      explanation: integrationEvidence.length ? "At least one integration boundary is evidenced." : "Integration requirements are not evidenced.",
      evidence: integrationEvidence,
      missingInformation: integrationEvidence.length ? [] : ["Clarify how systems exchange data and whether APIs are available."],
    },
    {
      key: "organizational-readiness",
      label: "Organizational Readiness",
      score: coverage(organizationalEvidence, 3),
      explanation: organizationalEvidence.length >= 2 ? "Confirmed facts provide an initial organizational baseline." : "People ownership and affected-user evidence are incomplete.",
      evidence: organizationalEvidence,
      missingInformation: organizationalEvidence.length >= 2 ? [] : ["Clarify who performs, owns, and is affected by the process."],
    },
    {
      key: "constraint-clarity",
      label: "Constraint Clarity",
      score: coverage(understanding.constraints, 2),
      explanation: understanding.constraints.length ? "Known constraints have been recorded." : "Budget, timeline, compliance, and migration constraints are not evidenced.",
      evidence: understanding.constraints,
      missingInformation: understanding.constraints.length ? [] : ["Clarify budget, timeline, compliance, privacy, and migration constraints."],
    },
  ]
  const scored = dimensions.filter((dimension): dimension is typeof dimension & { score: number } => dimension.score !== null)
  const overallScore = scored.length === dimensions.length ? Math.round(scored.reduce((sum, dimension) => sum + dimension.score, 0) / scored.length) : null
  return {
    status: overallScore === null ? "INSUFFICIENT_INFORMATION" : "READY",
    overallScore,
    evidenceBased: true,
    dimensions,
    summary: overallScore === null ? "INTELLY does not have enough evidence to produce a reliable readiness percentage yet." : "Readiness coverage is based only on structured intake, persisted answers, and traceable project evidence.",
  }
}

export function mergeDiscoveryInterview(
  current: DiscoveryState,
  interview: DiscoveryInterview,
): DiscoveryState {
  const nextProgress = Math.max(current.progress, Math.min(100, interview.understanding.confirmedFacts.length * 10 + interview.understanding.observedProblems.length * 15 + interview.understanding.businessImpact.length * 10 + interview.questions.length * 5))
  const readyForAnalysis = interview.readyForAnalysis || current.readyForAnalysis
  return {
    ...current,
    status: current.status === "ANALYSIS_COMPLETE" ? "ANALYSIS_COMPLETE" : readyForAnalysis ? "READY_FOR_ANALYSIS" : "IN_PROGRESS",
    progress: nextProgress,
    readyForAnalysis,
    confidence: Math.max(current.confidence, interview.confidence),
    questions: interview.questions.slice(0, 6),
    understanding: interview.understanding,
    lastUpdatedAt: new Date().toISOString(),
  }
}

export function formatDiscoveryUnderstanding(understanding: DiscoveryUnderstanding): string {
  return [
    understanding.confirmedFacts.length ? `Confirmed facts: ${understanding.confirmedFacts.map((fact) => fact.statement).join("; ")}` : "",
    understanding.currentProcess.length ? `Current process: ${understanding.currentProcess.join("; ")}` : "",
    understanding.observedProblems.length ? `Observed problems: ${understanding.observedProblems.map((problem) => problem.title).join("; ")}` : "",
    understanding.potentialRootCauses.length ? `Potential root causes: ${understanding.potentialRootCauses.map((cause) => cause.statement).join("; ")}` : "",
    understanding.businessImpact.length ? `Business impact: ${understanding.businessImpact.join("; ")}` : "",
    understanding.unknowns.length ? `Unknowns: ${understanding.unknowns.join("; ")}` : "",
    understanding.constraints.length ? `Constraints: ${understanding.constraints.join("; ")}` : "",
  ].filter(Boolean).join("\n")
}
