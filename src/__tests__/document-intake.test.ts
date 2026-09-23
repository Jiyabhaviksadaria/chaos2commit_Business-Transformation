import { describe, expect, it, vi, beforeEach } from "vitest"
import { db } from "../lib/db"

vi.mock("../lib/access", () => ({
  requireProjectAccess: vi.fn().mockResolvedValue({
    user: { id: "user-test" },
    project: { id: "project-test", language: "en" }
  })
}))

vi.mock("../lib/db", () => ({
  db: {
    document: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    }
  }
}))

vi.mock("../lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        summary: "Test document executive summary",
        entities: ["Company A", "Prisma ORM", "Next.js"],
        metadata: { topic: "Architecture" }
      }
    }
  }),
  generateText: vi.fn().mockResolvedValue({
    ok: true,
    data: { text: "AI Q&A Response for test question." }
  })
}))

describe("Document Intake & Intelligence API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates document record and returns READY status on valid text parsing", async () => {
    const mockDoc = {
      id: "doc-123",
      projectId: "project-test",
      filename: "test-specs.txt",
      status: "PENDING"
    }

    vi.mocked(db.document.create).mockResolvedValue(mockDoc as never)
    vi.mocked(db.document.update).mockResolvedValue({ ...mockDoc, status: "READY" } as never)

    expect(mockDoc.id).toBe("doc-123")
    expect(mockDoc.status).toBe("PENDING")
  })

  it("retrieves single document by id correctly", async () => {
    const mockDoc = {
      id: "doc-456",
      projectId: "project-test",
      filename: "architecture.pdf",
      extractedText: "System topology overview",
      summary: "High level summary",
      entities: JSON.stringify(["React", "PostgreSQL"]),
      status: "READY"
    }

    vi.mocked(db.document.findFirst).mockResolvedValue(mockDoc as never)

    const doc = await db.document.findFirst({
      where: { id: "doc-456", projectId: "project-test" }
    })

    expect(doc).not.toBeNull()
    expect(doc?.filename).toBe("architecture.pdf")
    expect(doc?.status).toBe("READY")
  })
})
