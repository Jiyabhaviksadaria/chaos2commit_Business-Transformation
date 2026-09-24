import { z } from "zod"
import { DeliverableType } from "@prisma/client"
import { registerDeliverable } from "../registry"

export const RequirementsSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  businessRequirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    businessReason: z.string().optional(),
    sourceProblem: z.string().optional(),
    affectedUser: z.string().optional(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    acceptanceCriteria: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
    evidence: z.array(z.string()).optional()
  })),
  userStories: z.array(z.object({
    id: z.string(),
    asA: z.string(),
    iWantTo: z.string(),
    soThat: z.string(),
    acceptanceCriteria: z.array(z.string())
  })).optional()
})

export type RequirementsOutput = z.infer<typeof RequirementsSchema>

export const requirementsFixture: RequirementsOutput = {
  title: "Mock Requirements",
  executiveSummary: "This is a mock implementation generated for the Requirements deliverable.",
  businessRequirements: [
    {
      id: "BR-1",
      title: "User Authentication",
      description: "Users must be able to log in securely.",
      priority: "HIGH"
    }
  ],
  userStories: [
    {
      id: "US-1",
      asA: "User",
      iWantTo: "login",
      soThat: "I can access my workspace",
      acceptanceCriteria: ["Validates credentials", "Has forgot password"]
    }
  ]
}

export function initRequirementsModule() {
  registerDeliverable({
    type: DeliverableType.REQUIREMENTS,
    i18nTitleKey: "deliverables.requirements",
    dependsOn: [], // no prerequisites for requirements
    systemPrompt: `You are a Senior Business Analyst. Create a rigorous, evidence-driven Business Requirements Document based only on the user's project context. For every business requirement, connect it to a discovered problem, business reason, affected user, acceptance criteria, dependencies, and available evidence where supported. Mark unsupported assumptions as assumptions or unknowns. Follow the requested schema exactly. Do not invent precision or silently turn inferred root causes into facts.`,
    buildUserPrompt: (ctx: string, extraInstructions?: string) => {
      let prompt = `Here is the canonical INTELLY project context, including structured company context, discovery understanding, evidence, and persisted analysis:\n\n${ctx}\n\nGenerate requirements that propagate the discovered problems, root causes, business impact, user roles, and constraints into testable capabilities. Cite the source problem or evidence whenever available.`
      if (extraInstructions) {
        prompt += `\n\nAdhere to these additional instructions:\n${extraInstructions}`
      }
      return prompt
    },
    outputSchema: RequirementsSchema,
    mockFixture: requirementsFixture
  })
}
