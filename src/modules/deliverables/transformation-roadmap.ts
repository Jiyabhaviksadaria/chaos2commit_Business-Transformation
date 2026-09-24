import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const TransformationRoadmapSchema = z.object({
  title: z.string(),
  overallDurationMonths: z.number(),
  phases: z.array(z.object({
    phaseNumber: z.number(),
    name: z.string(),
    durationWeeks: z.number(),
    keyObjectives: z.array(z.string()),
    deliverables: z.array(z.string()),
    milestones: z.array(z.string()),
    riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"])
  })),
  changeManagementStrategy: z.array(z.string()),
  aiAdoptionMilestones: z.array(z.string()),
  disclaimer: z.string()
})

export type TransformationRoadmapData = z.infer<typeof TransformationRoadmapSchema>

export const MOCK_ROADMAP_FIXTURE: TransformationRoadmapData = {
  title: "Enterprise Digital Transformation Roadmap",
  overallDurationMonths: 6,
  phases: [
    {
      phaseNumber: 1,
      name: "Phase 1: Discovery & Architecture Blueprinting",
      durationWeeks: 4,
      keyObjectives: ["Conduct process mining", "Define API & Schema contracts", "Establish Cloud Environment"],
      deliverables: ["PRD Specification", "BPMN Process Maps", "Security Blueprint"],
      milestones: ["Kickoff Approval", "Architecture Sign-off"],
      riskLevel: "LOW"
    },
    {
      phaseNumber: 2,
      name: "Phase 2: Core Platform & AI Model Integration",
      durationWeeks: 8,
      keyObjectives: ["Build core microservices", "Deploy Next.js Frontend", "Integrate LLM Orchestration"],
      deliverables: ["POS Core MVP", "AI Recommendation Engine", "CI/CD Pipeline"],
      milestones: ["Alpha Demo", "Security Penetration Test"],
      riskLevel: "MEDIUM"
    },
    {
      phaseNumber: 3,
      name: "Phase 3: Rollout, Pilot & Change Management",
      durationWeeks: 12,
      keyObjectives: ["Store pilot deployment", "Staff training & onboarding", "Performance tuning"],
      deliverables: ["User Guides", "Production System", "Post-launch Audit"],
      milestones: ["Go-Live", "100% Migration Complete"],
      riskLevel: "LOW"
    }
  ],
  changeManagementStrategy: [
    "Stakeholder alignment workshops",
    "Role-based staff training curriculum",
    "Feedback loop & weekly steering committee reviews"
  ],
  aiAdoptionMilestones: [
    "Month 1: Automated Intake Processing",
    "Month 3: Predictive Inventory Recommendations",
    "Month 6: Autonomous Process Optimization"
  ],
  disclaimer: "Roadmap timelines and effort metrics are estimated based on typical enterprise project velocities."
}

export function initTransformationRoadmapModule() {
  registerDeliverable<TransformationRoadmapData>({
    type: DeliverableType.ROADMAP,
    i18nTitleKey: "deliverables.roadmap.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: "You are a Lead Transformation Program Lead. Generate a comprehensive roadmap from the discovered problems, root causes, business impact, requirements, selected solution direction, constraints, and organizational context. Sequence outcomes and dependencies clearly. Do not invent precise timelines or compliance outcomes when evidence is insufficient; mark them for validation.",
    buildUserPrompt: (ctx: string) => `Generate an evidence-based Transformation Roadmap from the canonical INTELLY context and preserve problem, requirement, and dependency links:\n\n${ctx}`,
    outputSchema: TransformationRoadmapSchema,
    mockFixture: MOCK_ROADMAP_FIXTURE
  })
}
