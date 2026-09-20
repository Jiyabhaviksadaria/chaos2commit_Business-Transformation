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
    priority: z.enum(["HIGH", "MEDIUM", "LOW"])
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
    systemPrompt: `You are a Senior Business Analyst. Create a rigorous, complete Business Requirements Document based on the user's project context. Follow the requested schema exactly.`,
    buildUserPrompt: (ctx: string, extraInstructions?: string) => {
      let prompt = `Here is the current project context:\n\n${ctx}\n\nPlease generate the Business Requirements Document.`
      if (extraInstructions) {
        prompt += `\n\nAdhere to these additional instructions:\n${extraInstructions}`
      }
      return prompt
    },
    outputSchema: RequirementsSchema,
    mockFixture: requirementsFixture
  })
}
