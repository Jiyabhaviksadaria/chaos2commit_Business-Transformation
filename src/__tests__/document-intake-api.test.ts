import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  project: { id: "project-1", language: "en", workspace: { organizationId: "org-1" } },
  documentFindFirst: vi.fn(),
  documentCreate: vi.fn(),
  documentUpdate: vi.fn(),
  sourceCreate: vi.fn(),
  projectUpdate: vi.fn(),
  rebuildProjectContext: vi.fn(),
}))

vi.mock("@/lib/access", () => ({ requireProjectAccess: vi.fn().mockResolvedValue({ user: { id: "user-1" }, project: mocks.project }) }))
vi.mock("@/lib/db", () => ({
  db: {
    document: { findFirst: mocks.documentFindFirst, create: mocks.documentCreate, update: mocks.documentUpdate },
    intakeSource: { create: mocks.sourceCreate },
    project: { update: mocks.projectUpdate },
  },
}))
vi.mock("@/lib/ai/context", () => ({ rebuildProjectContext: mocks.rebuildProjectContext }))
vi.mock("@/lib/ai/orchestrator", () => ({ generateStructured: vi.fn().mockResolvedValue({ ok: false, error: { message: "not configured" } }) }))

import { POST as uploadDocument } from "@/app/api/projects/[projectId]/documents/route"

function requestFor(file: File) {
  return {
    headers: new Headers(),
    formData: async () => ({ get: () => file }),
  } as unknown as Request
}

describe("document intake API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.documentFindFirst.mockResolvedValue(null)
    mocks.documentCreate.mockResolvedValue({ id: "document-1" })
    mocks.documentUpdate.mockResolvedValue({ id: "document-1", filename: "overview.txt", status: "READY", extractedText: "Business overview" })
    mocks.sourceCreate.mockResolvedValue({ id: "source-1", kind: "DOCUMENT", label: "overview.txt" })
    mocks.rebuildProjectContext.mockResolvedValue({ sources: [{ id: "source-1" }], sourceTypes: ["DOCUMENT"] })
  })

  it("extracts and persists a supported text document", async () => {
    const response = await uploadDocument(requestFor(new File(["Business overview for Acme"], "overview.txt", { type: "text/plain" })), { params: { projectId: "project-1" } })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.source.id).toBe("source-1")
    expect(mocks.documentUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "READY", extractedText: expect.stringContaining("Acme") }) }))
    expect(mocks.rebuildProjectContext).toHaveBeenCalledWith("project-1")
  })

  it("rejects an empty upload before creating a document row", async () => {
    const response = await uploadDocument(requestFor(new File([], "empty.txt", { type: "text/plain" })), { params: { projectId: "project-1" } })
    expect(response.status).toBe(422)
    expect(mocks.documentCreate).not.toHaveBeenCalled()
  })

  it("rejects a duplicate checksum without creating another row", async () => {
    mocks.documentFindFirst.mockResolvedValue({ id: "existing", filename: "overview.txt", status: "READY" })
    const response = await uploadDocument(requestFor(new File(["Business overview for Acme"], "overview.txt", { type: "text/plain" })), { params: { projectId: "project-1" } })
    expect(response.status).toBe(409)
    expect(mocks.documentCreate).not.toHaveBeenCalled()
  })
})
