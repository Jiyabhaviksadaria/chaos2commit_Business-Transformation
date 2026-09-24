import { z } from "zod"
import { DeliverableType } from "@prisma/client"
import { registerDeliverable } from "../registry"

export const ApiDesignSchema = z.object({
  title: z.string(),
  baseUrl: z.string(),
  authentication: z.array(z.string()),
  endpoints: z.array(z.object({
    path: z.string(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    purpose: z.string(),
    requestSchema: z.string().optional(),
    responseSchema: z.string(),
    authorization: z.string().optional(),
    businessRequirementIds: z.array(z.string()).optional(),
    relatedProcess: z.string().optional(),
    dataUsed: z.array(z.string()).optional(),
    evidenceRefs: z.array(z.string()).optional(),
  })),
  errorModel: z.array(z.string()),
  versioningStrategy: z.string(),
  disclaimer: z.string(),
})

export type ApiDesignData = z.infer<typeof ApiDesignSchema>

const fixture: ApiDesignData = {
  title: "Project API contract",
  baseUrl: "/api",
  authentication: [],
  endpoints: [],
  errorModel: [],
  versioningStrategy: "Version the contract when a breaking change is required.",
  disclaimer: "API contracts are generated from the canonical project context and require engineering review.",
}

export function initApiDesignModule() {
  registerDeliverable<ApiDesignData>({
    type: DeliverableType.API_DESIGN,
    i18nTitleKey: "deliverables.api_design.title",
    dependsOn: [DeliverableType.DATABASE_DESIGN],
    systemPrompt: "You are an enterprise API architect. Generate an evidence-based REST API contract from the discovered business problems, requirements, processes, user roles, data needs, and integration evidence. For each endpoint explain its business purpose, related process, data used, authentication requirement, and requirement/problem/evidence links when available. Never invent an endpoint, integration, or API availability unrelated to the evidence.",
    buildUserPrompt: (ctx: string) => `Design the API contract from the canonical project context:\n\n${ctx}`,
    outputSchema: ApiDesignSchema,
    mockFixture: fixture,
  })
}
