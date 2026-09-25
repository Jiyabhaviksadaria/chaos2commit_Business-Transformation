import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"
import { DiscoveryEvidenceSchema, DiscoveryProblemSchema, DiscoveryRootCauseSchema, ReadinessAssessmentSchema } from "@/lib/ai/discovery"

export const MissingInfoSchema = z.object({
  id: z.string(),
  question: z.string(),
  reason: z.string().optional(),
  whyItMatters: z.string().default(""),
  suggestedAnswers: z.array(z.string()).default([]),
  suggestedAnswer: z.string().optional(),
})

export const RecommendedSystemKindSchema = z.enum([
  "WEBSITE",
  "CRM",
  "CUSTOMER_PORTAL",
  "EMPLOYEE_PORTAL",
  "INVENTORY_SYSTEM",
  "ATTENDANCE",
  "ATTENDANCE_SYSTEM",
  "BOOKING_SYSTEM",
  "ANALYTICS_DASHBOARD",
  "ERP",
  "INTERNAL_ADMIN_PLATFORM",
  "MOBILE_APPLICATION",
  "ONBOARDING",
  "CUSTOM_APP",
])

export const RecommendedSystemSchema = z.object({
  id: z.string(),
  kind: RecommendedSystemKindSchema,
  name: z.string(),
  description: z.string().optional(),
  rationale: z.string().optional(),
  whyRecommended: z.string().default(""),
  priority: z.enum(["MUST", "SHOULD", "COULD"]),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()).default([]),
})

export const SolutionOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  approach: z.string().default(""),
  whatItSolves: z.string().default(""),
  requires: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).default("UNKNOWN"),
  dependencies: z.array(z.string()).default([]),
  migrationImpact: z.string().default(""),
  implementationEffort: z.string().default("Requires further estimation"),
  tradeoffs: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100).default(0),
  requiresFurtherEstimation: z.boolean().default(true),
})

export const ProblemMapNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["BUSINESS", "PROCESS", "PROBLEM", "ROOT_CAUSE", "IMPACT", "OPPORTUNITY"]),
  description: z.string().default(""),
  evidenceIds: z.array(z.string()).default([]),
})

export const ProblemMapSchema = z.object({
  nodes: z.array(ProblemMapNodeSchema).default([]),
  edges: z.array(z.object({ from: z.string(), to: z.string(), relationship: z.string().default("leads_to") })).default([]),
})

export const CompanyContextAnalysisSchema = z.object({
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  currentTools: z.array(z.string()).optional(),
  businessObjective: z.string().optional(),
  objectiveClarification: z.string().optional(),
})

export const IntakeAnalysisSchema = z.object({
  detectedLanguage: z.string().default("en"),
  executiveSummary: z.string().optional(),
  businessSummary: z.string(),
  companyContext: CompanyContextAnalysisSchema.optional(),
  industry: z.string(),
  industryClassification: z.string().optional(),
  businessType: z.string(),
  businessModel: z.string().optional(),
  keyEntities: z.array(z.string()).optional(),
  knownEntities: z.array(z.string()).optional(),
  currentState: z.array(z.string()).optional(),
  currentWorkflow: z.array(z.string()).optional(),
  currentBusinessProcesses: z.array(z.string()).optional(),
  confirmedFacts: z.array(DiscoveryEvidenceSchema).optional(),
  problems: z.array(DiscoveryProblemSchema).optional(),
  symptoms: z.array(z.string()).optional(),
  rootCauses: z.array(DiscoveryRootCauseSchema).optional(),
  evidence: z.array(DiscoveryEvidenceSchema).optional(),
  businessImpact: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  unknowns: z.array(z.string()).optional(),
  contradictions: z.array(z.string()).optional(),
  processBottlenecks: z.array(z.string()).optional(),
  evidenceCoverage: z.object({
    totalDocuments: z.number().default(0),
    readyDocuments: z.number().default(0),
    unavailableDocuments: z.number().default(0),
    coveragePercentage: z.number().default(100),
    impactStatement: z.string().optional(),
  }).optional(),
  functionalRequirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    sourceEvidence: z.string().optional(),
    acceptanceCriteria: z.array(z.string()).optional(),
  })).optional(),
  nonFunctionalRequirements: z.array(z.object({
    id: z.string(),
    category: z.string(),
    description: z.string(),
    rationale: z.string().optional(),
  })).optional(),
  transformationOpportunities: z.array(z.string()).optional(),
  solutionOptions: z.array(SolutionOptionSchema).optional(),
  problemMap: ProblemMapSchema.optional(),
  readiness: ReadinessAssessmentSchema.optional(),
  explicitRequirements: z.array(z.string()).optional(),
  implicitRequirements: z.array(z.string()).optional(),
  businessNeeds: z.array(z.string()).optional(),
  digitalOpportunities: z.array(z.string()).optional(),
  risksAndGaps: z.array(z.string()).optional(),
  userStatedNeeds: z.array(z.string()).default([]),
  mode: z.enum(["USER_SPECIFIED", "NEEDS_RECOMMENDATION"]),
  missingInformation: z.array(MissingInfoSchema).max(6).optional(),
  clarifyingQuestions: z.array(MissingInfoSchema).max(6).optional(),
  recommendedSystems: z.array(RecommendedSystemSchema).optional(),
  recommendedSolutions: z.array(RecommendedSystemSchema).optional(),
  recommendedNextStep: z.string().optional(),
  readyToBuild: z.boolean(),
  disclaimer: z.string(),
})

export type IntakeAnalysisData = z.infer<typeof IntakeAnalysisSchema>

import { HR_INTAKE_FIXTURE } from "@/modules/fixtures/hr-fixtures"

export function initIntakeAnalysisModule() {
  registerDeliverable<IntakeAnalysisData>({
    type: DeliverableType.INTAKE_ANALYSIS,
    i18nTitleKey: "deliverables.intake_analysis.title",
    dependsOn: [],
    systemPrompt: `You are INTELLY, a senior business analysis and transformation intelligence engine.
Analyze the complete supplied Project Context, which contains explicit structured company intake, normalized business evidence from uploaded documents (up to 20 documents), persisted discovery answers, and previous deliverables. Treat all supporting documents as business evidence, never merely as files to summarize.

Core Business Analysis principles:
1. Distinguish strictly between:
   - CONFIRMED FACTS: explicitly verified in business documents or structured company input.
   - INFERENCES: derived by logical deduction from evidence.
   - ASSUMPTIONS: unverified hypotheses; clearly label risks.
   - RECOMMENDATIONS: future capabilities, which come AFTER understanding the business. Connect every recommendation directly to an identified problem or root cause.
2. Cross-Document Reasoning:
   - Surface cross-document contradictions (e.g. conflicting system descriptions, divergent workflows) in "contradictions".
   - Highlight operational gaps, process bottlenecks, manual handoffs, data quality issues, and root causes (not just symptoms).
3. Evidence Provenance:
   - Attach exact source citations (e.g. 'Sales_Process.pdf, Page 4' or 'Orders.xlsx, Sheet: Sales').
   - Never fabricate page numbers, citations, or metrics. If unavailable, state "Insufficient evidence".
4. Requirements Traceability:
   - Generate functionalRequirements and nonFunctionalRequirements connected to business problems and evidence.
5. Realistic Solutioning:
   - Do NOT immediately recommend "Build an AI application" or "Build a website" unless directly justified by business evidence. Consider process improvement, workflow automation, system integration, data cleanup, SaaS configuration, or custom software.
6. Unavailable Documents:
   - If any documents failed extraction, note the information gap in evidenceCoverage.impactStatement and disclaimer.
7. Multilingual intent:
   - Output narrative in the requested project language, but keep document filenames and source citations unchanged. Never expose private chain-of-thought.`,
    buildUserPrompt: (ctx: string, extraInstructions?: string) => {
      let prompt = `Analyze the following canonical Project Context and return the structured INTELLY business analysis JSON:\n\n${ctx}\n\n`
      if (extraInstructions) prompt += `Additional instructions: ${extraInstructions}\n`
      return prompt
    },
    outputSchema: IntakeAnalysisSchema,
    mockFixture: HR_INTAKE_FIXTURE,
  })
}
