import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const UxDesignSchema = z.object({
  title: z.string(),
  screenConcepts: z.array(z.object({
    screenId: z.string(),
    name: z.string(),
    userRole: z.string(),
    purpose: z.string(),
    keyComponents: z.array(z.string()),
    layoutGrid: z.string(),
    userActions: z.array(z.string()),
    problemIds: z.array(z.string()).optional(),
    requirementIds: z.array(z.string()).optional(),
    evidenceRefs: z.array(z.string()).optional()
  })),
  navigationFlow: z.array(z.string()),
  uxRecommendations: z.array(z.string()),
  disclaimer: z.string()
})

export type UxDesignData = z.infer<typeof UxDesignSchema>

export const MOCK_UX_DESIGN_FIXTURE: UxDesignData = {
  title: "POS & Operations Dashboard UX Wireframe Concepts",
  screenConcepts: [
    {
      screenId: "screen-1",
      name: "Cashier POS Dashboard",
      userRole: "Store Cashier / Associate",
      purpose: "Fast checkout processing, barcode scanning, and inventory lookup",
      keyComponents: ["Barcode Scanner Input", "Cart Item List", "Quick Payment Buttons", "Member Loyalty Badge"],
      layoutGrid: "2-Column Split (Cart 60% Left, Quick Keys 40% Right)",
      userActions: ["Scan Barcode", "Apply Discount", "Process Payment", "Print Receipt"]
    },
    {
      screenId: "screen-2",
      name: "Store Manager Operations Console",
      userRole: "Store Manager",
      purpose: "Real-time revenue monitoring, stock alert overrides, and staff schedules",
      keyComponents: ["Daily Revenue KPI Card", "Stock Out Risk Alert Widget", "Staff Shift Grid", "AI Forecast Graph"],
      layoutGrid: "4-Card Header Grid + 2-Column Details",
      userActions: ["Approve Restock", "Override Price", "Export Daily Report"]
    }
  ],
  navigationFlow: [
    "Login -> POS Main Screen -> Checkout Modal -> Receipt Confirmation",
    "Login -> Store Manager Dashboard -> Stock Alerts -> Auto-Reorder Trigger"
  ],
  uxRecommendations: [
    "Use high-contrast large touch targets (min 48px) for tablet POS devices",
    "Support offline status indicator badge with automatic queued sync feedback",
    "Apply Intelly pastel warm color palette to minimize eye strain during long shifts"
  ],
  disclaimer: "UX wireframes and navigation recommendations are intended for design prototyping."
}

export function initUxDesignModule() {
  registerDeliverable<UxDesignData>({
    type: DeliverableType.WIREFRAMES,
    i18nTitleKey: "deliverables.wireframes.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: "You are a Lead Business UX Analyst. Generate role-specific UX concepts from the discovered user roles, workflows, pain points, root causes, requirements, and evidence. Explain which problem each screen/workflow addresses and link to requirement/problem/evidence IDs when available. Do not create generic dashboards for users and processes that are not evidenced.",
    buildUserPrompt: (ctx: string) => `Generate role-specific UX Wireframe Concepts from the canonical INTELLY context. Preserve workflow, problem, requirement, and evidence links:\n\n${ctx}`,
    outputSchema: UxDesignSchema,
    mockFixture: MOCK_UX_DESIGN_FIXTURE
  })
}
