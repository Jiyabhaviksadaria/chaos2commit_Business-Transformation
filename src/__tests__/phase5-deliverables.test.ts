import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import "@/modules/registry"
import { POST as generateHandler } from "@/app/api/projects/[projectId]/deliverables/generate/route"
import { GET as exportHandler } from "@/app/api/projects/[projectId]/export/route"

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    user: { id: "u1" },
    project: {
      id: "p1",
      name: "Test Deliverable Project",
      language: "en",
      workspace: { organizationId: "org1" }
    }
  })
}))

vi.mock("@/lib/ai/context", () => ({
  buildProjectContext: vi.fn().mockResolvedValue("Context string")
}))

vi.mock("@/lib/db", () => ({
  db: {
    deliverable: {
      findFirst: vi.fn().mockResolvedValue({
        id: "d1",
        projectId: "p1",
        type: "REQUIREMENTS",
        status: "DRAFT",
        versions: [{ id: "v1", versionNumber: 1, content: { title: "Test Requirement PRD" } }]
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: "d1",
          type: "REQUIREMENTS",
          versions: [{ id: "v1", content: { title: "Test PRD" } }]
        }
      ]),
      create: vi.fn().mockResolvedValue({ id: "d1", projectId: "p1", type: "REQUIREMENTS", status: "DRAFT" }),
      update: vi.fn().mockResolvedValue({ id: "d1", currentVersionId: "v1" })
    },
    deliverableVersion: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "v1", deliverableId: "d1", versionNumber: 1 })
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({ id: "a1" })
    },
    project: {
      findUnique: vi.fn().mockResolvedValue({ id: "p1", name: "Test Deliverable Project", language: "en" })
    },
    $transaction: vi.fn().mockImplementation((cb) => cb({
      deliverable: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "d1", projectId: "p1", type: "REQUIREMENTS", status: "DRAFT" }),
        update: vi.fn().mockResolvedValue({ id: "d1", currentVersionId: "v1" })
      },
      deliverableVersion: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "v1", deliverableId: "d1", versionNumber: 1 })
      },
      activityLog: {
        create: vi.fn().mockResolvedValue({ id: "a1" })
      }
    }))
  }
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        executiveSummary: "Generated Summary",
        businessRequirements: [],
        userStories: [],
        nonFunctionalRequirements: []
      }
    }
  })
}))

describe("Phase 5 Deliverable Suite API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("POST /api/projects/[projectId]/deliverables/generate creates a new deliverable version", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/deliverables/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "REQUIREMENTS", language: "en" })
    })

    const res = await generateHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.deliverable).toBeDefined()
  })

  it("GET /api/projects/[projectId]/export exports deliverables in JSON format", async () => {
    const req = new NextRequest("http://localhost/api/projects/p1/export?format=json&type=REQUIREMENTS", {
      method: "GET"
    })

    const res = await exportHandler(req, { params: { projectId: "p1" } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toBeDefined()
  })
})
