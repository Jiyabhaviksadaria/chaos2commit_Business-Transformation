import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import "@/modules/registry"
import { GET as getBlueprint, POST as generateBlueprint } from "@/app/api/projects/[projectId]/blueprint/route"
import { POST as approveBlueprint } from "@/app/api/projects/[projectId]/blueprint/approve/route"
import { GET as getRecommendations } from "@/app/api/projects/[projectId]/recommendations/route"

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    user: { id: "u1" },
    project: {
      id: "p1",
      name: "Test Blueprint Project",
      language: "en",
      workspace: { organizationId: "org1" }
    }
  })
}))

vi.mock("@/lib/ai/context", () => ({
  buildProjectContext: vi.fn().mockResolvedValue("Context string for Blueprint")
}))

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: "p1",
        name: "Test Blueprint Project",
        lifecycle: "BLUEPRINT",
        blueprintData: {
          productOverview: "Test Dental Clinic Platform",
          requirements: [
            {
              id: "REQ-001",
              title: "Online Appointment Booking",
              category: "KNOWN",
              description: "Allow patients to book slots online.",
              priority: "CRITICAL",
              status: "APPROVED",
              explainability: {
                why: "Reduces manual phone calls",
                contextUsed: "Patient scheduling context",
                evidence: "User request",
                assumptions: "Patients have Internet access",
                alternatives: "Manual desk registration",
                confidence: 0.95
              }
            }
          ],
          userRoles: [{ role: "PATIENT", description: "End user booking slots", permissions: ["book:appointment"] }],
          userJourneys: [],
          modules: [],
          features: [],
          nonFunctionalRequirements: [],
          businessRules: [],
          workflows: [],
          integrations: [],
          aiFeatures: [],
          dataEntities: [],
          security: { auth: "NextAuth", rbac: true, compliance: [] },
          architecture: { type: "Next.js 14", stack: ["TypeScript", "Prisma"] },
          ux: { theme: "Intelly", layout: "Sidebar" },
          apis: [],
          database: { dialect: "PostgreSQL", ORM: "Prisma" },
          deployment: { provider: "Vercel", environment: "Production" },
          recommendations: [],
          assumptions: [],
          openQuestions: [],
          estimatedComplexity: "MEDIUM",
          buildStatus: "READY_FOR_BUILD"
        }
      }),
      update: vi.fn().mockResolvedValue({
        id: "p1",
        lifecycle: "BUILDING",
        blueprintData: {}
      })
    },
    recommendation: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "r1",
          projectId: "p1",
          title: "Automated Appointment Reminders",
          category: "AUTOMATION",
          impact: "HIGH",
          status: "PENDING"
        }
      ]),
      create: vi.fn().mockResolvedValue({
        id: "r1",
        projectId: "p1",
        title: "Automated Reminders",
        status: "PENDING"
      })
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({ id: "a1" })
    }
  }
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        productOverview: "Generated Dental Platform Blueprint",
        businessObjective: "Streamline appointment scheduling",
        productObjective: "Automate booking and patient records",
        targetUsers: ["Patients", "Dentists", "Receptionists"],
        userRoles: [{ role: "Dentist", description: "Medical provider", permissions: ["read:records"] }],
        userJourneys: [],
        modules: [{ key: "appointments", name: "Appointments Module", description: "Schedule manager" }],
        features: [{ key: "book_slot", title: "Book Slot", moduleKey: "appointments", priority: "HIGH" }],
        requirements: [
          {
            id: "REQ-001",
            title: "Online Appointment Booking",
            category: "KNOWN",
            description: "Patients select available time slots online.",
            priority: "CRITICAL",
            status: "DRAFT",
            explainability: {
              why: "Reduces front desk bottleneck",
              contextUsed: "Scheduling requirement",
              evidence: "Dental clinic context",
              assumptions: "Patients have mobile web access",
              alternatives: "Phone booking",
              confidence: 0.96
            }
          }
        ],
        nonFunctionalRequirements: [],
        businessRules: [],
        workflows: [],
        integrations: [],
        aiFeatures: [],
        dataEntities: [],
        security: { auth: "NextAuth OAuth2 + JWT", rbac: true, compliance: [] },
        architecture: { type: "Next.js 14 App Router", stack: ["TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL"] },
        ux: { theme: "Intelly Modern Pastel", layout: "Dark Sidebar Dashboard" },
        apis: [],
        database: { dialect: "PostgreSQL", ORM: "Prisma" },
        deployment: { provider: "Vercel", environment: "Production" },
        recommendations: [],
        assumptions: [],
        openQuestions: [],
        estimatedComplexity: "MEDIUM",
        buildStatus: "READY_FOR_BUILD"
      }
    }
  })
}))

describe("Phase 6 Master Blueprint & Approval API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET /api/projects/[projectId]/blueprint retrieves current blueprint and lifecycle", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/blueprint", { method: "GET" })
    const res = await getBlueprint(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.lifecycle).toBe("BLUEPRINT")
    expect(json.blueprint.productOverview).toContain("Dental Clinic")
  })

  it("POST /api/projects/[projectId]/blueprint generates a new master blueprint", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/blueprint", { method: "POST" })
    const res = await generateBlueprint(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.blueprint).toBeDefined()
    expect(json.blueprint.requirements.length).toBeGreaterThan(0)
  })

  it("POST /api/projects/[projectId]/blueprint/approve approves blueprint and sets lifecycle to BUILDING", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/blueprint/approve", { method: "POST" })
    const res = await approveBlueprint(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.lifecycle).toBe("BUILDING")
  })

  it("GET /api/projects/[projectId]/recommendations returns recommendations with explainability", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/recommendations", { method: "GET" })
    const res = await getRecommendations(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.recommendations.length).toBeGreaterThan(0)
  })
})
