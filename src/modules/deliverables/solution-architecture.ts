import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

export const SolutionArchitectureSchema = z.object({
  title: z.string(),
  architectureType: z.enum(["MICROSERVICES", "SERVERLESS", "EVENT_DRIVEN", "MONOLITHIC_MODULAR"]),
  highLevelDesign: z.object({
    components: z.array(z.object({
      name: z.string(),
      description: z.string(),
      technology: z.string(),
      layer: z.enum(["FRONTEND", "BACKEND", "DATABASE", "INTEGRATION", "SECURITY"]),
      whyRequired: z.string().optional(),
      businessRequirementIds: z.array(z.string()).optional(),
      problemIds: z.array(z.string()).optional(),
      evidenceRefs: z.array(z.string()).optional()
    })),
    dataFlowSummary: z.string(),
    securityArchitecture: z.array(z.string()),
    cloudInfrastructure: z.array(z.string())
  }),
  lowLevelDesign: z.object({
    services: z.array(z.object({
      serviceName: z.string(),
      protocol: z.string(),
      scalingStrategy: z.string(),
      dependencies: z.array(z.string())
    })),
    deploymentStrategy: z.string()
  }),
  microsoftEcosystemOptions: z.array(z.string()),
  disclaimer: z.string()
})

export type SolutionArchitectureData = z.infer<typeof SolutionArchitectureSchema>

export const MOCK_SOLUTION_ARCH_FIXTURE: SolutionArchitectureData = {
  title: "Retail POS & Inventory Solution Architecture",
  architectureType: "EVENT_DRIVEN",
  highLevelDesign: {
    components: [
      { name: "Next.js Web Client", description: "PWA for store managers & POS cashiers", technology: "Next.js / React / Tailwind", layer: "FRONTEND" },
      { name: "API Gateway", description: "Authentication, rate-limiting, and routing", technology: "Azure API Management", layer: "INTEGRATION" },
      { name: "Order & Inventory Service", description: "Core domain logic for transactions", technology: "Node.js / Express / Prisma", layer: "BACKEND" },
      { name: "PostgreSQL Database", description: "Primary transactional data store", technology: "Azure Database for PostgreSQL", layer: "DATABASE" },
      { name: "Key Vault & Security", description: "Secrets and OAuth token management", technology: "Azure Key Vault", layer: "SECURITY" }
    ],
    dataFlowSummary: "POS terminals communicate via HTTPS with Azure API Gateway, publishing inventory events to Event Grid for async processing.",
    securityArchitecture: ["OAuth2 / OIDC Authentication", "TLS 1.3 Encryption in transit", "AES-256 Data encryption at rest", "Role-Based Access Control (RBAC)"],
    cloudInfrastructure: ["Azure Container Apps", "Azure Event Grid", "Azure PostgreSQL Flexible Server", "Redis Cache"]
  },
  lowLevelDesign: {
    services: [
      { serviceName: "Intake-Service", protocol: "REST / HTTPS", scalingStrategy: "Auto-scale 2-10 instances based on CPU", dependencies: ["PostgreSQL"] },
      { serviceName: "Notification-Service", protocol: "gRPC", scalingStrategy: "Event-based scaling", dependencies: ["Event Grid"] }
    ],
    deploymentStrategy: "Blue-Green Deployment with Azure DevOps CI/CD Pipelines"
  },
  microsoftEcosystemOptions: ["Azure App Service", "Power Apps for store managers", "Dynamics 365 Integration"],
  disclaimer: "AI-generated architecture recommendations are advisory and should be validated by certified Enterprise Architects."
}

export function initSolutionArchitectureModule() {
  registerDeliverable<SolutionArchitectureData>({
    type: DeliverableType.ARCHITECTURE_HLD,
    i18nTitleKey: "deliverables.architecture_hld.title",
    dependsOn: [DeliverableType.SYSTEM_SPEC],
    systemPrompt: "You are a Lead Solution Architect. Generate a High-Level and Low-Level Solution Architecture specification from the discovered business problems, requirements, selected or candidate solutions, process needs, data needs, and constraints. Explain why every component is required and link components to requirement/problem/evidence IDs when available. Never invent unavailable APIs, integrations, compliance, or exact non-functional targets.",
    buildUserPrompt: (ctx: string) => `Generate Solution Architecture based on the canonical INTELLY context. Preserve requirement/problem/evidence links and explain component necessity:\n\n${ctx}`,
    outputSchema: SolutionArchitectureSchema,
    mockFixture: MOCK_SOLUTION_ARCH_FIXTURE
  })
}
