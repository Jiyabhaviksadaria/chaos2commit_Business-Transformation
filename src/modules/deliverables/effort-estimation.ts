import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const EffortEstimationSchema = z.object({
  title: z.string(),
  totalEstimatedHours: z.number(),
  totalEstimatedCostUSD: z.number(),
  sprintPlan: z.array(z.object({
    sprintNumber: z.number(),
    sprintGoal: z.string(),
    storyPoints: z.number(),
    tasks: z.array(z.string())
  })),
  resourceAllocation: z.array(z.object({
    role: z.string(),
    count: z.number(),
    allocatedHours: z.number()
  })),
  riskPredictions: z.array(z.object({
    risk: z.string(),
    impact: z.enum(["HIGH", "MEDIUM", "LOW"]),
    mitigationStrategy: z.string()
  })),
  disclaimer: z.string()
})

export type EffortEstimationData = z.infer<typeof EffortEstimationSchema>

export const MOCK_EFFORT_ESTIMATION_FIXTURE: EffortEstimationData = {
  title: "POS Digital Transformation Effort & Cost Estimation",
  totalEstimatedHours: 640,
  totalEstimatedCostUSD: 52000,
  sprintPlan: [
    {
      sprintNumber: 1,
      sprintGoal: "Environment setup, database migration, and auth flow",
      storyPoints: 34,
      tasks: ["Azure Infrastructure Setup", "Prisma Database Schema Setup", "NextAuth Integration"]
    },
    {
      sprintNumber: 2,
      sprintGoal: "Core POS Checkout API & Barcode Scanning Module",
      storyPoints: 42,
      tasks: ["POS Cart Logic", "REST Endpoints", "Offline SQLite Cache Sync"]
    },
    {
      sprintNumber: 3,
      sprintGoal: "Store Manager Dashboard & AI Demand Forecast",
      storyPoints: 38,
      tasks: ["Analytics Widgets", "Export Reports PDF/Excel", "Integration Testing"]
    }
  ],
  resourceAllocation: [
    { role: "Senior Full-Stack Engineer", count: 2, allocatedHours: 320 },
    { role: "Cloud Solution Architect", count: 1, allocatedHours: 120 },
    { role: "UI/UX Designer", count: 1, allocatedHours: 80 },
    { role: "QA Automation Engineer", count: 1, allocatedHours: 120 }
  ],
  riskPredictions: [
    {
      risk: "Legacy POS hardware compatibility delays",
      impact: "HIGH",
      mitigationStrategy: "Develop browser-based fallback app with WebUSB barcode scanner support"
    },
    {
      risk: "Network outage in rural store branches",
      impact: "MEDIUM",
      mitigationStrategy: "Implement offline transaction queuing with local SQLite storage"
    }
  ],
  disclaimer: "Effort and cost estimates are calculated using standard AI parametric model assumptions."
}

export function initEffortEstimationModule() {
  registerDeliverable<EffortEstimationData>({
    type: DeliverableType.ESTIMATION,
    i18nTitleKey: "deliverables.estimation.title",
    dependsOn: [DeliverableType.SYSTEM_SPEC],
    systemPrompt: "Generate an Effort, Cost, Resource, and Risk Estimation report in JSON format.",
    buildUserPrompt: (ctx: string) => `Generate Effort & Cost Estimation based on context:\n\n${ctx}`,
    outputSchema: EffortEstimationSchema,
    mockFixture: MOCK_EFFORT_ESTIMATION_FIXTURE
  })
}
