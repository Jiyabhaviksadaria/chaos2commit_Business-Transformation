import { z } from "zod"
import { DeliverableType } from "@prisma/client"
import { registerDeliverable } from "../registry"

export const SolutionRecommendationSchema = z.object({
  title: z.string(),
  solutions: z.array(z.object({
    name: z.string(),
    description: z.string(),
    priority: z.enum(["MUST", "SHOULD", "COULD"]),
    confidence: z.number().min(0).max(100),
    rationale: z.string(),
    evidence: z.array(z.string()),
    dependencies: z.array(z.string()).default([]),
    whatItSolves: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    complexity: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]).optional(),
    migrationImpact: z.string().optional(),
    implementationEffort: z.string().optional(),
    tradeoffs: z.array(z.string()).optional(),
    requiresFurtherEstimation: z.boolean().optional(),
  })),
  rejectedOrDeferred: z.array(z.string()).default([]),
  disclaimer: z.string(),
})

export type SolutionRecommendationData = z.infer<typeof SolutionRecommendationSchema>

const fixture: SolutionRecommendationData = {
  title: "Evidence-based solution recommendations",
  solutions: [],
  rejectedOrDeferred: [],
  disclaimer: "Recommendations are generated only from the persisted project context and should be validated by stakeholders.",
}

export function initSolutionRecommendationModule() {
  registerDeliverable<SolutionRecommendationData>({
    type: DeliverableType.SOLUTION_RECOMMENDATION,
    i18nTitleKey: "deliverables.solution_recommendation.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: "You are a Principal Business Transformation Advisor. Compare multiple viable solution approaches only when supported by the discovered problems, root causes, impact, constraints, and evidence. For each option state what it solves, requirements, benefits, risks, complexity, dependencies, migration impact, trade-offs, and whether effort requires further estimation. Return JSON with title, solutions, rejectedOrDeferred, and disclaimer. Each solution must have name, description, priority MUST/SHOULD/COULD, confidence 0-100, rationale, evidence, and dependencies. Do not recommend website creation unless the evidence explicitly requests it; Website Builder is separate.",
    buildUserPrompt: (ctx: string) => `Generate evidence-based solution options from this canonical INTELLY project context. Preserve problem/evidence links from the Business Analysis and explain rejected or deferred alternatives:\n\n${ctx}`,
    outputSchema: SolutionRecommendationSchema,
    mockFixture: fixture,
  })
}
