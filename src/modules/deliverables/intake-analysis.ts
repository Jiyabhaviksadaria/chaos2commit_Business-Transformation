import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const MissingInfoSchema = z.object({
  id: z.string(),
  question: z.string(),
  whyItMatters: z.string(),
  suggestedAnswers: z.array(z.string())
})

export const RecommendedSystemSchema = z.object({
  id: z.string(),
  kind: z.enum(["WEBSITE", "CRM", "ATTENDANCE", "ONBOARDING", "CUSTOM_APP"]),
  name: z.string(),
  whyRecommended: z.string(),
  priority: z.enum(["MUST", "SHOULD", "COULD"]),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string())
})

export const IntakeAnalysisSchema = z.object({
  detectedLanguage: z.string().default("en"),
  businessSummary: z.string(),
  industry: z.string(),
  businessType: z.string(),
  knownEntities: z.array(z.string()),
  userStatedNeeds: z.array(z.string()),
  mode: z.enum(["USER_SPECIFIED", "NEEDS_RECOMMENDATION"]),
  missingInformation: z.array(MissingInfoSchema).max(6),
  recommendedSystems: z.array(RecommendedSystemSchema),
  readyToBuild: z.boolean(),
  disclaimer: z.string()
})

export type IntakeAnalysisData = z.infer<typeof IntakeAnalysisSchema>

import { HR_INTAKE_FIXTURE } from "@/modules/fixtures/hr-fixtures"

export function initIntakeAnalysisModule() {
  registerDeliverable<IntakeAnalysisData>({
    type: DeliverableType.INTAKE_ANALYSIS,
    i18nTitleKey: "deliverables.intake_analysis.title",
    dependsOn: [],
    systemPrompt: `You are an expert Enterprise Architect and Business Analyst. Analyze the provided business context.
Return a JSON object with:
- detectedLanguage: 2-letter ISO code of the primary input language
- businessSummary: concise 2-3 sentence description
- industry: e.g. "Human Resources", "Healthcare", "Retail"
- businessType: e.g. "B2B Services", "B2C Retail", "SaaS"
- knownEntities: key business objects mentioned (e.g. companies, candidates, clients)
- userStatedNeeds: systems the user explicitly asked for
- mode: "USER_SPECIFIED" if they listed systems, "NEEDS_RECOMMENDATION" if vague
- missingInformation: max 6 clarifying questions (id, question, whyItMatters, suggestedAnswers array)
- recommendedSystems: each with id, kind (WEBSITE|CRM|ATTENDANCE|ONBOARDING|CUSTOM_APP), name, whyRecommended, priority (MUST|SHOULD|COULD), confidence 0-100, evidence array
- readyToBuild: true if enough info to start building
- disclaimer: advisory disclaimer text in the output language`,
    buildUserPrompt: (ctx: string, extraInstructions?: string) => {
      let prompt = `Analyze this business context and return the intake analysis JSON:\n\n${ctx}\n\n`
      if (extraInstructions) prompt += `Additional instructions: ${extraInstructions}\n`
      return prompt
    },
    outputSchema: IntakeAnalysisSchema,
    mockFixture: HR_INTAKE_FIXTURE
  })
}
