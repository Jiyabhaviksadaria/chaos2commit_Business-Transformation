import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST as GeneratePOST } from "../app/api/projects/[projectId]/deliverables/generate/route"
import { PATCH as EditPATCH } from "../app/api/projects/[projectId]/deliverables/[type]/route"
import { NextRequest } from "next/server"

// Mock the permission framework & generic router structures explicitly
vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    user: { id: "u1" }, 
    project: { workspace: { organizationId: "org-1" } }
  })
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: { data: { title: "Test", executiveSummary: "AI Generated" }, provider: "mock", model: "mock-model" }
  })
}))

vi.mock("@/lib/ai/context", () => ({
  buildProjectContext: vi.fn().mockResolvedValue("Context mock")
}))

const mockDb = vi.hoisted(() => {
  const db = {
    $transaction: vi.fn((cb) => cb(db)),
    deliverable: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "deliv-1" }),
      update: vi.fn().mockResolvedValue({ id: "deliv-1", currentVersionId: "ver-1" })
    },
    deliverableVersion: {
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue({ id: "ver-1", versionNumber: 2 })
    },
    activityLog: {
      create: vi.fn()
    }
  }
  return db
})

vi.mock("@/lib/db", () => ({ db: mockDb }))

describe("Deliverable API Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Generates successfully avoiding overwriting historic traces generating versionNumber sequentially", async () => {
    const req = new NextRequest("http://localhost/generate", {
      method: "POST",
      body: JSON.stringify({ type: "REQUIREMENTS", language: "en" })
    })

    const response = await GeneratePOST(req, { params: { projectId: "proj-1" } })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.version.versionNumber).toBe(2)
    // Ensures exactly 1 version generated mapping
    expect(mockDb.deliverableVersion.create).toHaveBeenCalledOnce()
  })

  it("Rejects PATCH edits avoiding non-Zod validated objects", async () => {
    const req = new NextRequest("http://localhost/patch", {
      method: "PATCH",
      body: JSON.stringify({ content: { title: "Missing Summary!" } })
    })

    const response = await EditPATCH(req, { params: { projectId: "proj-1", type: "REQUIREMENTS" } })
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBeDefined()
  })
})
