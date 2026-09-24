import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const GapAnalysisSchema = z.object({
  title: z.string(),
  currentState: z.string(),
  futureState: z.string(),
  gapItems: z.array(z.object({
    id: z.string(),
    area: z.string(),
    currentDeficiency: z.string(),
    desiredTarget: z.string(),
    gapSeverity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    recommendedAction: z.string()
  })),
  stakeholderImpact: z.array(z.object({
    stakeholderGroup: z.string(),
    impactDescription: z.string(),
    readinessLevel: z.enum(["READY", "NEEDS_TRAINING", "RESISTANT"])
  })),
  digitalMaturityScore: z.number().min(1).max(5).nullable(),
  disclaimer: z.string()
})

export type GapAnalysisData = z.infer<typeof GapAnalysisSchema>

export const MOCK_GAP_ANALYSIS_FIXTURE: GapAnalysisData = {
  title: "Business Process Gap & Digital Maturity Assessment",
  currentState: "Manual paper-based inventory tracking, legacy non-connected POS terminals, 4-hour delay in sales reporting.",
  futureState: "Cloud-native real-time inventory ledger, automated POS sync, instant executive analytics dashboard.",
  gapItems: [
    {
      id: "gap-1",
      area: "Inventory Synchronization",
      currentDeficiency: "Inventory counts updated only during end-of-day batch processing",
      desiredTarget: "Real-time sub-second inventory deduction upon barcode scan",
      gapSeverity: "CRITICAL",
      recommendedAction: "Deploy Event Grid webhook integration between POS terminals and database"
    },
    {
      id: "gap-2",
      area: "Customer Loyalty Integration",
      currentDeficiency: "Cashiers cannot look up customer purchase history in-store",
      desiredTarget: "Omnichannel CRM integration with instant discount calculation",
      gapSeverity: "HIGH",
      recommendedAction: "Expose Customer Lookup API on POS cashier interface"
    }
  ],
  stakeholderImpact: [
    { stakeholderGroup: "Store Cashiers", impactDescription: "Transitioning to touchscreen tablet POS app", readinessLevel: "NEEDS_TRAINING" },
    { stakeholderGroup: "Store Managers", impactDescription: "Real-time inventory visibility reduces manual audit time by 75%", readinessLevel: "READY" }
  ],
  digitalMaturityScore: 3.8,
  disclaimer: "Gap analysis recommendations are generated based on initial business discovery data."
}

export function initGapAnalysisModule() {
  registerDeliverable<GapAnalysisData>({
    type: DeliverableType.GAP_ANALYSIS,
    i18nTitleKey: "deliverables.gap_analysis.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: "You are a Lead Business Transformation Analyst. Generate an evidence-driven AS-IS / TO-BE gap analysis from the discovered current process, problems, root causes, impact, constraints, and selected requirements. Link gaps to the source problem where possible. Use insufficient information rather than inventing a maturity score or compliance claim.",
    buildUserPrompt: (ctx: string) => `Generate Gap Analysis based on context:\n\n${ctx}`,
    outputSchema: GapAnalysisSchema,
    mockFixture: MOCK_GAP_ANALYSIS_FIXTURE
  })
}
