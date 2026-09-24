import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  project: { id: "project-1", workspace: { organizationId: "org-1" } },
  findFirst: vi.fn(),
  create: vi.fn(),
  projectUpdate: vi.fn(),
  rebuild: vi.fn(),
  validate: vi.fn(),
  canonicalize: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock("@/lib/access", () => ({ requireProjectAccess: vi.fn().mockResolvedValue({ user: { id: "user-1" }, project: mocks.project }) }))
vi.mock("@/lib/db", () => ({ db: { intakeSource: { findFirst: mocks.findFirst, create: mocks.create }, project: { update: mocks.projectUpdate } } }))
vi.mock("@/lib/ai/context", () => ({ rebuildProjectContext: mocks.rebuild }))
vi.mock("@/lib/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ssrf")>("@/lib/ssrf")
  return { ...actual, validateExternalUrl: mocks.validate, canonicalizeUrl: mocks.canonicalize }
})
vi.mock("@/lib/intake/url", () => ({ fetchAndExtractWebsite: mocks.fetch }))

import { POST as ingestUrl } from "@/app/api/intake/url/route"

describe("URL intake API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.validate.mockResolvedValue(new URL("https://acme.example/"))
    mocks.canonicalize.mockReturnValue("https://acme.example")
    mocks.findFirst.mockResolvedValue(null)
    mocks.create.mockResolvedValue({ id: "source-1", kind: "URL", label: "https://acme.example", url: "https://acme.example/", metadata: {} })
    mocks.projectUpdate.mockResolvedValue({})
    mocks.rebuild.mockResolvedValue({ sources: [{ id: "source-1" }], sourceTypes: ["URL"] })
    mocks.fetch.mockResolvedValue({
      requestedUrl: "https://acme.example",
      finalUrl: "https://acme.example/",
      responseUrl: "https://acme.example/",
      title: "Acme",
      description: "Acme business",
      text: "Acme provides business services.",
      metadata: { title: "Acme" },
      status: 200,
      contentType: "text/html",
    })
  })

  it("persists extracted website content into the canonical context", async () => {
    const request = new Request("http://localhost/api/intake/url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: "project-1", url: "https://acme.example" }) })
    const response = await ingestUrl(request, { params: { projectId: "project-1" } })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.source.id).toBe("source-1")
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kind: "URL", extractedText: expect.stringContaining("business services") }) }))
    expect(mocks.rebuild).toHaveBeenCalledWith("project-1")
  })

  it("treats an already-ingested URL as idempotent", async () => {
    mocks.findFirst.mockResolvedValue({ id: "existing", kind: "URL", label: "https://acme.example" })
    const request = new Request("http://localhost/api/intake/url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: "project-1", url: "https://acme.example" }) })
    const response = await ingestUrl(request, { params: { projectId: "project-1" } })
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.duplicate).toBe(true)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
