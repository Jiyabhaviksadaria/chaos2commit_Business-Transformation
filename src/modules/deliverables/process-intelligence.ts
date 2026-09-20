import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const ProcessIntelligenceSchema = z.object({
  title: z.string(),
  processName: z.string(),
  bpmnSteps: z.array(z.object({
    stepId: z.string(),
    label: z.string(),
    type: z.enum(["START_EVENT", "USER_TASK", "SERVICE_TASK", "DECISION_GATEWAY", "END_EVENT"]),
    actor: z.string(),
    description: z.string(),
    automationPotential: z.enum(["HIGH", "MEDIUM", "LOW"])
  })),
  swimlanes: z.array(z.object({
    role: z.string(),
    responsibilities: z.array(z.string())
  })),
  optimizationOpportunities: z.array(z.string()),
  disclaimer: z.string()
})

export type ProcessIntelligenceData = z.infer<typeof ProcessIntelligenceSchema>

export const MOCK_PROCESS_INTELLIGENCE_FIXTURE: ProcessIntelligenceData = {
  title: "POS Inventory & Order Processing Workflow",
  processName: "Omnichannel Order Fulfillment & Inventory Rebalance",
  bpmnSteps: [
    { stepId: "step-1", label: "Customer Submits Order", type: "START_EVENT", actor: "Customer / POS", description: "Order created via mobile POS or in-store terminal", automationPotential: "HIGH" },
    { stepId: "step-2", label: "Inventory Stock Check", type: "SERVICE_TASK", actor: "System API", description: "Automated real-time inventory lookup across store network", automationPotential: "HIGH" },
    { stepId: "step-3", label: "Sufficient Local Stock?", type: "DECISION_GATEWAY", actor: "Rules Engine", description: "Evaluates local vs regional fulfillment center inventory", automationPotential: "HIGH" },
    { stepId: "step-[#4]", label: "Store Associate Packing", type: "USER_TASK", actor: "Store Staff", description: "Associate receives mobile app alert to pick and pack items", automationPotential: "MEDIUM" },
    { stepId: "step-5", label: "Order Fulfilled & Ledger Updated", type: "END_EVENT", actor: "System API", description: "Transaction completed, digital receipt emailed", automationPotential: "HIGH" }
  ],
  swimlanes: [
    { role: "Customer / POS", responsibilities: ["Item selection", "Payment processing"] },
    { role: "Store Staff", responsibilities: ["Item picking", "Package handover"] },
    { role: "AI System Engine", responsibilities: ["Stock reservation", "Automated reorder triggers"] }
  ],
  optimizationOpportunities: [
    "Automate re-order triggers when safety stock drops below 15 units",
    "Replace manual barcode verification with RFID instant scan",
    "Deploy AI demand forecasting to prevent stockouts"
  ],
  disclaimer: "Process workflows are generated based on current state operational prompts."
}

export function initProcessIntelligenceModule() {
  registerDeliverable<ProcessIntelligenceData>({
    type: DeliverableType.PROCESS_MAP,
    i18nTitleKey: "deliverables.process_map.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: "Generate a Process Intelligence BPMN & Workflow Specification in JSON format.",
    buildUserPrompt: (ctx: string) => `Generate Process Intelligence workflow based on context:\n\n${ctx}`,
    outputSchema: ProcessIntelligenceSchema,
    mockFixture: MOCK_PROCESS_INTELLIGENCE_FIXTURE
  })
}
