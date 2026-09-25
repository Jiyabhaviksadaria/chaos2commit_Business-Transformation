import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  user: { id: "user-1", organizationId: "org-1", role: "USER", companyRole: "Founder / Co-Founder" },
  projectCreate: vi.fn(),
  deliverableCreate: vi.fn(),
  deliverableVersionCreate: vi.fn(),
  deliverableUpdate: vi.fn(),
  workspaceFindFirst: vi.fn(),
  organizationFindUnique: vi.fn(),
  organizationCreate: vi.fn(),
  workspaceCreate: vi.fn(),
  projectFindMany: vi.fn(),
}))

vi.mock("@/lib/access", () => ({
  requireUser: vi.fn().mockResolvedValue(mocks.user),
  requireOrgMember: vi.fn().mockResolvedValue({ user: mocks.user, orgRole: "OWNER" }),
}))
vi.mock("@/lib/db", () => ({
  db: {
    workspace: { findFirst: mocks.workspaceFindFirst, create: mocks.workspaceCreate },
    organization: { findUnique: mocks.organizationFindUnique, create: mocks.organizationCreate },
    project: { create: mocks.projectCreate, findMany: mocks.projectFindMany },
    deliverable: { create: mocks.deliverableCreate, update: mocks.deliverableUpdate },
    deliverableVersion: { create: mocks.deliverableVersionCreate },
  },
}))

import { POST as createProject } from "@/app/api/projects/route"

describe("project intake creation contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.workspaceFindFirst.mockResolvedValue({ id: "workspace-1", organizationId: "org-1" })
    mocks.projectCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "project-1", ...data }))
    mocks.deliverableCreate.mockResolvedValue({ id: "deliverable-1" })
    mocks.deliverableVersionCreate.mockResolvedValue({ id: "version-1" })
    mocks.deliverableUpdate.mockResolvedValue({ id: "deliverable-1", currentVersionId: "version-1" })
  })

  it("creates an analysis project without seeding a website deliverable", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "analyze", intakeUrl: "https://example.com" }),
    })
    const response = await createProject(request)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.project.id).toBe("project-1")
    expect(body.project.intakeUrl).toBe("https://example.com/")
    expect(mocks.projectCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ projectContext: expect.objectContaining({ create: expect.objectContaining({ metadata: expect.objectContaining({ userContext: expect.objectContaining({ companyRole: "Founder / Co-Founder" }) }) }) }) }) }))
    expect(mocks.deliverableCreate).not.toHaveBeenCalled()
  })

  it("persists structured company context for a new analysis project", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "analyze",
        companyContext: {
          companyName: "ABC Retail",
          industry: "Retail",
          companySize: "201–1,000 employees",
          userRole: "Operations Manager",
          currentTools: ["Legacy POS", "Excel"],
          businessObjective: "Modernize inventory operations",
        },
      }),
    })
    const response = await createProject(request)
    expect(response.status).toBe(200)
    expect(mocks.projectCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      name: "ABC Retail",
      projectContext: expect.objectContaining({ create: expect.objectContaining({ metadata: expect.objectContaining({ companyContext: expect.objectContaining({ companyName: "ABC Retail" }) }) }) }),
    }) }))
  })

  it("rejects an analysis project with no source signal", async () => {
    const request = new Request("http://localhost/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "analyze" }) })
    const response = await createProject(request)
    expect(response.status).toBe(400)
    expect(mocks.projectCreate).not.toHaveBeenCalled()
  })

  it("preserves the explicit Website Builder template flow", async () => {
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "build", templateId: "clinic", name: "Clinic", businessGoal: "Build website using clinic template baseline" }),
    })
    const response = await createProject(request)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.deliverable.id).toBe("deliverable-1")
    expect(mocks.deliverableCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: "WEBSITE_SPEC" }) }))
  })
})
