import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const DatabaseApiDesignSchema = z.object({
  title: z.string(),
  databaseSchema: z.object({
    entities: z.array(z.object({
      name: z.string(),
      description: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        isPrimary: z.boolean().default(false),
        isNullable: z.boolean().default(false)
      })),
      relationships: z.array(z.string()),
      businessProblemIds: z.array(z.string()).optional(),
      requirementIds: z.array(z.string()).optional(),
      evidenceRefs: z.array(z.string()).optional()
    }))
  }),
  apiEndpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    description: z.string(),
    requestBody: z.string().optional(),
    responseBody: z.string(),
    businessRequirementIds: z.array(z.string()).optional(),
    relatedProcess: z.string().optional(),
    dataUsed: z.array(z.string()).optional(),
    authenticationRequirement: z.string().optional(),
    evidenceRefs: z.array(z.string()).optional()
  })),
  integrationArchitecture: z.array(z.string()),
  disclaimer: z.string()
})

export type DatabaseApiDesignData = z.infer<typeof DatabaseApiDesignSchema>

export const MOCK_DATABASE_API_FIXTURE: DatabaseApiDesignData = {
  title: "Retail POS Database Schema & OpenAPI Specification",
  databaseSchema: {
    entities: [
      {
        name: "Store",
        description: "Retail physical store location",
        fields: [
          { name: "id", type: "UUID", isPrimary: true, isNullable: false },
          { name: "code", type: "VARCHAR(50)", isPrimary: false, isNullable: false },
          { name: "name", type: "VARCHAR(255)", isPrimary: false, isNullable: false },
          { name: "address", type: "TEXT", isPrimary: false, isNullable: true }
        ],
        relationships: ["Has Many InventoryRecords", "Has Many Cashiers"]
      },
      {
        name: "Product",
        description: "Merchandise item in catalog",
        fields: [
          { name: "id", type: "UUID", isPrimary: true, isNullable: false },
          { name: "sku", type: "VARCHAR(100)", isPrimary: false, isNullable: false },
          { name: "title", type: "VARCHAR(255)", isPrimary: false, isNullable: false },
          { name: "unitPrice", type: "DECIMAL(10,2)", isPrimary: false, isNullable: false }
        ],
        relationships: ["Has Many InventoryRecords", "Has Many OrderItems"]
      }
    ]
  },
  apiEndpoints: [
    {
      path: "/api/v1/stores/{storeId}/inventory",
      method: "GET",
      description: "List real-time inventory count for a given store",
      responseBody: "{ storeId: string, items: [{ sku: string, quantity: number }] }"
    },
    {
      path: "/api/v1/orders",
      method: "POST",
      description: "Create and process a POS transaction order",
      requestBody: "{ storeId: string, cashierId: string, items: [{ sku: string, qty: number }] }",
      responseBody: "{ orderId: string, status: 'PAID', total: number }"
    }
  ],
  integrationArchitecture: [
    "RESTful API over HTTPS with JWT bearer tokens",
    "OpenAPI 3.0 Specification export ready",
    "Webhook notifications for real-time inventory alerts"
  ],
  disclaimer: "Database schemas and API endpoints are advisory recommendations for implementation."
}

export function initDatabaseApiDesignModule() {
  registerDeliverable<DatabaseApiDesignData>({
    type: DeliverableType.DATABASE_DESIGN,
    i18nTitleKey: "deliverables.database_design.title",
    dependsOn: [DeliverableType.SYSTEM_SPEC],
    systemPrompt: "You are a Lead Data and API Architect. Generate a database schema and API specification grounded in the discovered business problems, requirements, process steps, user roles, integrations, and evidence. Link entities and endpoints to requirement/problem/evidence IDs when available. Explain purpose, related process, data used, and authentication requirement. Do not claim an API or integration exists without evidence.",
    buildUserPrompt: (ctx: string) => `Generate Database & API Specification from the canonical INTELLY context. Trace every entity and endpoint back to a requirement, process, user role, or evidence item when available:\n\n${ctx}`,
    outputSchema: DatabaseApiDesignSchema,
    mockFixture: MOCK_DATABASE_API_FIXTURE
  })
}
