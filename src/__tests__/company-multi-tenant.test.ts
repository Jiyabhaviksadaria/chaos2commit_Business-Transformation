import { beforeEach, describe, expect, it, vi } from "vitest"
import { OrgRole } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  requireUser: vi.fn(),
  requireOrgMember: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    teamConversation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}))

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}))

vi.mock("@/lib/access", () => ({
  requireUser: mocks.requireUser,
  requireOrgMember: mocks.requireOrgMember,
  AccessError: class AccessError extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = "AccessError"
    }
  },
  AuthError: class AuthError extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = "AuthError"
    }
  },
}))

import { GET as getCompanies } from "@/app/api/onboarding/companies/route"
import { POST as selectCompany } from "@/app/api/onboarding/company/route"
import { POST as switchOrganization } from "@/app/api/organization/switch/route"
import { GET as getMyOrganizations } from "@/app/api/organization/me/route"
import { GET as getProjects } from "@/app/api/projects/route"
import { SEEDED_COMPANIES, ALLOWED_COMPANY_SLUGS } from "@/lib/companies/seed-companies"
import { NextRequest } from "next/server"

describe("Phase 2 & 20: Predefined Seeded Companies Configuration", () => {
  it("defines exactly 3 deterministic seeded companies with correct slugs and attributes", () => {
    expect(SEEDED_COMPANIES.length).toBe(3)
    expect(ALLOWED_COMPANY_SLUGS).toEqual(["intelly-technologies", "urbannest-home", "democorp"])
    const slugs = SEEDED_COMPANIES.map((c) => c.slug)
    expect(slugs).toContain("intelly-technologies")
    expect(slugs).toContain("urbannest-home")
    expect(slugs).toContain("democorp")

    const intelly = SEEDED_COMPANIES.find((c) => c.slug === "intelly-technologies")!
    expect(intelly.name).toBe("Intelly Technologies")
    expect(intelly.industry).toBe("AI & Software")
    expect(intelly.channels.map((ch) => ch.name)).toContain("general")
    expect(intelly.channels.map((ch) => ch.name)).toContain("business-analysis")
    expect(intelly.members.map((m) => m.email)).toContain("khushi@intelly.local")
    expect(intelly.members.map((m) => m.email)).toContain("jiya@intelly.local")

    const urbanNest = SEEDED_COMPANIES.find((c) => c.slug === "urbannest-home")!
    expect(urbanNest.name).toBe("UrbanNest Home")
    expect(urbanNest.industry).toBe("Furniture & Interior")
    expect(urbanNest.members.map((m) => m.email)).toContain("rahul@urbannest.local")
    // Tenant isolation: Rahul should not be an Intelly member
    expect(intelly.members.map((m) => m.email)).not.toContain("rahul@urbannest.local")
  })
})

describe("Phase 3 & 4: Company Listing and Selection Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.db.organization.upsert.mockResolvedValue({ id: "org-mock-id" })
    mocks.db.user.upsert.mockResolvedValue({ id: "user-mock-id" })
    mocks.db.workspace.findFirst.mockResolvedValue({ id: "ws-mock-id", name: "Workspace" })
    mocks.db.workspace.create.mockResolvedValue({ id: "ws-mock-id", name: "Workspace" })
    mocks.db.membership.upsert.mockResolvedValue({ id: "mem-mock-id" })
    mocks.db.teamConversation.findFirst.mockResolvedValue({ id: "conv-mock-id" })
    mocks.db.teamConversation.create.mockResolvedValue({ id: "conv-mock-id" })
    mocks.db.project.findFirst.mockResolvedValue({ id: "proj-mock-id" })
    mocks.db.project.create.mockResolvedValue({ id: "proj-mock-id" })
  })

  it("lists all seeded companies with membership indicator for authenticated user", async () => {
    mocks.getServerSession.mockResolvedValue({
      user: { id: "user-khushi", name: "Khushi Sharma" },
    })

    // Mock DB organization response
    mocks.db.organization.upsert.mockResolvedValue({ id: "org-1" })
    mocks.db.workspace.findFirst.mockResolvedValue({ id: "ws-1", name: "Intelly Technologies Workspace" })
    mocks.db.organization.findMany.mockResolvedValue([
      {
        id: "org-intelly",
        slug: "intelly-technologies",
        name: "Intelly Technologies",
        workspaces: [{ id: "ws-intelly", name: "Intelly Technologies Workspace" }],
        memberships: [{ userId: "user-khushi", role: OrgRole.OWNER }],
      },
      {
        id: "org-urbannest",
        slug: "urbannest-home",
        name: "UrbanNest Home",
        workspaces: [{ id: "ws-urbannest", name: "UrbanNest Home Workspace" }],
        memberships: [{ userId: "user-rahul", role: OrgRole.OWNER }],
      },
      {
        id: "org-democorp",
        slug: "democorp",
        name: "DemoCorp",
        workspaces: [{ id: "ws-democorp", name: "DemoCorp Workspace" }],
        memberships: [],
      },
    ])
    mocks.db.membership.count.mockResolvedValue(1)

    const res = await getCompanies()
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.companies.length).toBe(3)
    expect(body.membershipCount).toBe(1)

    // Khushi is a member of Intelly, but not UrbanNest or DemoCorp
    const intelly = body.companies.find((c: { slug: string }) => c.slug === "intelly-technologies")
    const urbannest = body.companies.find((c: { slug: string }) => c.slug === "urbannest-home")
    expect(intelly.isMember).toBe(true)
    expect(urbannest.isMember).toBe(false)
  })

  it("rejects company selection when unauthenticated with 401", async () => {
    const { AuthError } = await import("@/lib/access")
    mocks.requireUser.mockRejectedValue(new AuthError("You must be signed in to perform this action."))

    const req = new Request("http://localhost:3000/api/onboarding/company", {
      method: "POST",
      body: JSON.stringify({ slug: "intelly-technologies" }),
    })

    const res = await selectCompany(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain("sign in")
  })

  it("rejects an invalid or unseeded company selection with 400", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-123", email: "test@example.com" })
    mocks.db.organization.upsert.mockResolvedValue({ id: "org-1" })
    mocks.db.organization.findFirst.mockResolvedValue(null) // Not found or not in allowed list

    const req = new Request("http://localhost:3000/api/onboarding/company", {
      method: "POST",
      body: JSON.stringify({ slug: "malicious-org" }),
    })

    const res = await selectCompany(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain("not recognized")
  })

  it("creates server-side membership with EDITOR role (not OWNER) for normal user", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-new", email: "newuser@example.com" })
    mocks.db.organization.upsert.mockResolvedValue({ id: "org-1" })

    const seededOrg = {
      id: "org-intelly",
      slug: "intelly-technologies",
      name: "Intelly Technologies",
      workspaces: [{ id: "ws-intelly", name: "Intelly Technologies Workspace" }],
    }
    mocks.db.organization.findFirst.mockResolvedValue(seededOrg)
    mocks.db.membership.findUnique.mockResolvedValue(null) // Not a member yet
    mocks.db.membership.create.mockResolvedValue({
      id: "mem-new",
      userId: "user-new",
      organizationId: "org-intelly",
      role: OrgRole.EDITOR,
    })

    const req = new Request("http://localhost:3000/api/onboarding/company", {
      method: "POST",
      body: JSON.stringify({ slug: "intelly-technologies" }),
    })

    const res = await selectCompany(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.alreadyMember).toBe(false)
    expect(body.organizationId).toBe("org-intelly")
    expect(body.workspaceId).toBe("ws-intelly")

    // Verify membership was created with EDITOR role
    expect(mocks.db.membership.create).toHaveBeenCalledWith({
      data: {
        userId: "user-new",
        organizationId: "org-intelly",
        role: OrgRole.EDITOR,
      },
    })
  })

  it("handles duplicate membership idempotently without creating duplicate record", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-existing", email: "existing@example.com" })
    mocks.db.organization.upsert.mockResolvedValue({ id: "org-1" })

    const seededOrg = {
      id: "org-intelly",
      slug: "intelly-technologies",
      name: "Intelly Technologies",
      workspaces: [{ id: "ws-intelly", name: "Intelly Technologies Workspace" }],
    }
    mocks.db.organization.findFirst.mockResolvedValue(seededOrg)
    // Membership already exists
    mocks.db.membership.findUnique.mockResolvedValue({
      id: "mem-existing",
      userId: "user-existing",
      organizationId: "org-intelly",
      role: OrgRole.EDITOR,
    })

    const req = new Request("http://localhost:3000/api/onboarding/company", {
      method: "POST",
      body: JSON.stringify({ slug: "intelly-technologies" }),
    })

    const res = await selectCompany(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.alreadyMember).toBe(true)
    expect(body.organizationId).toBe("org-intelly")
    // Membership create should NOT have been called
    expect(mocks.db.membership.create).not.toHaveBeenCalled()
  })
})

describe("Phase 8 & 9: Multi-Tenant Data Isolation and Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks Khushi from accessing UrbanNest projects by passing organizationId in query", async () => {
    const { AccessError } = await import("@/lib/access")
    mocks.requireUser.mockResolvedValue({
      id: "user-khushi",
      organizationId: "org-intelly",
    })

    // requireOrgMember rejects because Khushi is not a member of UrbanNest
    mocks.requireOrgMember.mockRejectedValue(new AccessError("You are not a member of this organization"))

    const req = new Request("http://localhost:3000/api/projects?organizationId=org-urbannest")
    const res = await getProjects(req)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain("You are not a member of this organization")
    expect(mocks.db.project.findMany).not.toHaveBeenCalled()
  })

  it("allows Khushi to view Intelly projects when authorized", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user-khushi",
      organizationId: "org-intelly",
    })
    mocks.requireOrgMember.mockResolvedValue({
      user: { id: "user-khushi" },
      orgRole: OrgRole.OWNER,
    })

    const mockProjects = [
      { id: "proj-1", name: "AI Transformation", workspace: { organizationId: "org-intelly" } },
    ]
    mocks.db.project.findMany.mockResolvedValue(mockProjects)

    const req = new Request("http://localhost:3000/api/projects?organizationId=org-intelly")
    const res = await getProjects(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
    expect(body[0].name).toBe("AI Transformation")
  })
})

describe("Phase 7 & 19: Multi-Organization Switching", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows user to switch active organization if they have membership", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-multi" })

    mocks.db.membership.findUnique.mockResolvedValue({
      id: "mem-2",
      userId: "user-multi",
      organizationId: "org-urbannest",
      role: OrgRole.EDITOR,
      organization: {
        id: "org-urbannest",
        name: "UrbanNest Home",
        workspaces: [{ id: "ws-urbannest", name: "UrbanNest Home Workspace" }],
      },
    })

    const req = new Request("http://localhost:3000/api/organization/switch", {
      method: "POST",
      body: JSON.stringify({ organizationId: "org-urbannest" }),
    })

    const res = await switchOrganization(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.organizationId).toBe("org-urbannest")
    expect(body.organizationName).toBe("UrbanNest Home")
  })

  it("rejects switching to an organization where user has no membership with 403", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-single" })
    mocks.db.membership.findUnique.mockResolvedValue(null) // No membership in requested org

    const req = new Request("http://localhost:3000/api/organization/switch", {
      method: "POST",
      body: JSON.stringify({ organizationId: "org-unauthorized" }),
    })

    const res = await switchOrganization(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toContain("not a member")
  })

  it("retrieves user organizations and marks active one correctly in /api/organization/me", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-multi" })

    mocks.db.membership.findMany.mockResolvedValue([
      {
        organizationId: "org-intelly",
        role: OrgRole.OWNER,
        organization: {
          id: "org-intelly",
          name: "Intelly Technologies",
          slug: "intelly-technologies",
          workspaces: [{ id: "ws-intelly", name: "Intelly Technologies Workspace" }],
        },
      },
      {
        organizationId: "org-urbannest",
        role: OrgRole.EDITOR,
        organization: {
          id: "org-urbannest",
          name: "UrbanNest Home",
          slug: "urbannest-home",
          workspaces: [{ id: "ws-urbannest", name: "UrbanNest Home Workspace" }],
        },
      },
    ])

    const req = new NextRequest("http://localhost:3000/api/organization/me", {
      headers: {
        cookie: "intelly_active_org=org-urbannest",
      },
    })

    const res = await getMyOrganizations(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.membershipCount).toBe(2)
    expect(body.activeOrganizationId).toBe("org-urbannest")
    expect(body.activeOrganizationName).toBe("UrbanNest Home")

    const urbannest = body.organizations.find((o: { id: string }) => o.id === "org-urbannest")
    expect(urbannest.isActive).toBe(true)
  })
})
