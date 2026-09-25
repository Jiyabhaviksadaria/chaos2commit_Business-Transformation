import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  project: { id: "proj-abc", language: "en", workspace: { organizationId: "org-1" } },
  documentFindMany: vi.fn(),
  documentFindFirst: vi.fn(),
  documentCreate: vi.fn(),
  documentUpdate: vi.fn(),
  documentDelete: vi.fn(),
  documentCount: vi.fn(),
  sourceCreate: vi.fn(),
  sourceDeleteMany: vi.fn(),
  rebuildProjectContext: vi.fn(),
}))

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockImplementation((projectId: string) => {
    if (projectId === "unauthorized-project") {
      const err = new Error("Access denied")
      err.name = "AccessError"
      throw err
    }
    return Promise.resolve({ user: { id: "user-1" }, project: mocks.project })
  }),
}))

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn((callback) => callback({
      document: { delete: mocks.documentDelete },
      intakeSource: { deleteMany: mocks.sourceDeleteMany },
    })),
    document: {
      findMany: mocks.documentFindMany,
      findFirst: mocks.documentFindFirst,
      create: mocks.documentCreate,
      update: mocks.documentUpdate,
      delete: mocks.documentDelete,
      count: mocks.documentCount,
    },
    intakeSource: {
      create: mocks.sourceCreate,
      deleteMany: mocks.sourceDeleteMany,
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/ai/context", () => ({
  rebuildProjectContext: mocks.rebuildProjectContext,
  getProjectContextSnapshot: vi.fn().mockResolvedValue({ sources: [], metadata: {} }),
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  generateStructured: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      data: {
        summary: "Executive business overview",
        entities: ["Salesforce", "ERP"],
      },
    },
  }),
}))

import { POST as uploadDocuments } from "@/app/api/projects/[projectId]/documents/route"
import { DELETE as deleteDocument } from "@/app/api/projects/[projectId]/documents/[docId]/route"
import { POST as retryDocument } from "@/app/api/projects/[projectId]/documents/[docId]/retry/route"
import { MAX_DOCUMENTS_PER_PROJECT } from "@/lib/intake/documents"

function createFormDataRequest(files: File[]): Request {
  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))
  return {
    headers: new Headers(),
    formData: async () => formData,
  } as unknown as Request
}

describe("Multi-Document Pipeline & Ingestion Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.documentCount.mockResolvedValue(0)
    mocks.documentFindFirst.mockResolvedValue(null)
    mocks.documentCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `doc-${Math.random().toString(36).slice(2, 7)}`, ...data }),
    )
    mocks.documentUpdate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "doc-1", status: "READY", ...data }),
    )
    mocks.sourceCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "source-1", ...data }),
    )
    mocks.rebuildProjectContext.mockResolvedValue({ sources: [{ id: "source-1" }], sourceTypes: ["DOCUMENT"] })
  })

  it("uploads and parses a single document with full metadata", async () => {
    const file = new File(["Process documentation for sales team\nStep 1: Lead capture"], "sales-process.txt", {
      type: "text/plain",
    })
    const req = createFormDataRequest([file])
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.documentCreate).toHaveBeenCalledTimes(1)
    expect(mocks.rebuildProjectContext).toHaveBeenCalledWith("proj-abc")
  })

  it("uploads multiple documents in a single batch", async () => {
    const file1 = new File(["Sales workflow: order entry and review"], "sales.txt", { type: "text/plain" })
    const file2 = new File(["CRM customer tracking and pipeline"], "crm.txt", { type: "text/plain" })
    const file3 = new File(["Financial invoice reconciliation notes"], "finance.txt", { type: "text/plain" })

    const req = createFormDataRequest([file1, file2, file3])
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.readyCount).toBe(3)
    expect(mocks.documentCreate).toHaveBeenCalledTimes(3)
    expect(mocks.sourceCreate).toHaveBeenCalledTimes(3)
  })

  it("allows uploading up to 20 documents per project", async () => {
    mocks.documentCount.mockResolvedValue(0)
    const files = Array.from({ length: 20 }, (_, i) =>
      new File([`Document content for department ${i + 1}`], `doc-${i + 1}.txt`, { type: "text/plain" }),
    )

    const req = createFormDataRequest(files)
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.readyCount).toBe(20)
  })

  it("rejects upload when it would exceed the 20 document limit", async () => {
    // Already has 19 documents
    mocks.documentCount.mockResolvedValue(19)

    // Attempt to upload 2 more (19 + 2 = 21 > 20)
    const file1 = new File(["Content 20"], "doc20.txt", { type: "text/plain" })
    const file2 = new File(["Content 21"], "doc21.txt", { type: "text/plain" })

    const req = createFormDataRequest([file1, file2])
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.limitExceeded).toBe(true)
    expect(body.maxAllowed).toBe(MAX_DOCUMENTS_PER_PROJECT)
    expect(body.error).toContain("would exceed the maximum limit of 20 documents")
    expect(mocks.documentCreate).not.toHaveBeenCalled()
  })

  it("rejects an oversized file exceeding 10MB", async () => {
    const hugeBuffer = new Uint8Array(11 * 1024 * 1024)
    const oversizedFile = new File([hugeBuffer], "huge-log.txt", { type: "text/plain" })

    const req = createFormDataRequest([oversizedFile])
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(413)
    expect(body.error).toContain("10MB")
  })

  it("rejects duplicate documents by checksum", async () => {
    mocks.documentFindFirst.mockResolvedValue({ id: "doc-dup", filename: "existing-spec.txt", status: "READY" })

    const file = new File(["Duplicate business plan"], "duplicate.txt", { type: "text/plain" })
    const req = createFormDataRequest([file])
    const res = await uploadDocuments(req, { params: { projectId: "proj-abc" } })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.duplicate).toBe(true)
    expect(body.error).toContain("already uploaded")
  })

  it("deletes a document and rebuilds project context", async () => {
    mocks.documentFindFirst.mockResolvedValue({ id: "doc-del", checksum: "hash-123" })

    const req = new Request("http://localhost", { method: "DELETE" })
    const res = await deleteDocument(req, { params: { projectId: "proj-abc", docId: "doc-del" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.documentDelete).toHaveBeenCalledWith({ where: { id: "doc-del" } })
    expect(mocks.rebuildProjectContext).toHaveBeenCalledWith("proj-abc")
  })

  it("allows retrying a failed document with a replacement file", async () => {
    mocks.documentFindFirst.mockResolvedValue({ id: "doc-failed", filename: "broken.txt", status: "FAILED" })

    const replacementFile = new File(["Fixed content with readable text"], "fixed.txt", { type: "text/plain" })
    const formData = new FormData()
    formData.append("file", replacementFile)

    const req = {
      formData: async () => formData,
    } as unknown as Request

    const res = await retryDocument(req, { params: { projectId: "proj-abc", docId: "doc-failed" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(mocks.documentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "doc-failed" },
        data: expect.objectContaining({ status: "READY", error: null }),
      }),
    )
  })

  it("enforces tenant security and rejects access to unauthorized projects", async () => {
    const file = new File(["Secret data"], "secret.txt", { type: "text/plain" })
    const req = createFormDataRequest([file])
    const res = await uploadDocuments(req, { params: { projectId: "unauthorized-project" } })

    expect(res.status).toBe(403)
  })
})
