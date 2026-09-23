/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET as getVersions } from "@/app/api/projects/[projectId]/deliverables/[type]/versions/route"
import { POST as restoreVersion } from "@/app/api/projects/[projectId]/deliverables/[type]/versions/[versionId]/restore/route"
import { GET as getApprovals } from "@/app/api/projects/[projectId]/deliverables/[type]/approvals/route"
import { POST as requestApproval } from "@/app/api/projects/[projectId]/deliverables/[type]/approvals/request/route"
import { POST as actionApproval } from "@/app/api/projects/[projectId]/deliverables/[type]/approvals/[approvalId]/route"

// Mock in-memory store
const mockVersionsStore: any[] = []
const mockApprovalsStore: any[] = []
const mockActivityLogsStore: any[] = []
const mockNotificationsStore: any[] = []

const mockUser = { id: "user_test_1", name: "Alice Lead", email: "alice@test.com" }
const mockReviewer = { id: "user_test_2", name: "Bob Reviewer", email: "bob@test.com" }

const mockDeliverablesStore = [
  {
    id: "deliv_11",
    projectId: "proj_phase11",
    type: "WEBSITE_SPEC",
    title: "Website Spec",
    status: "DRAFT",
    currentVersionId: "v_1"
  }
]

vi.mock("@/lib/db", () => ({
  db: {
    deliverable: {
      findFirst: vi.fn(async ({ where }: any) => {
        return mockDeliverablesStore.find(
          (d) =>
            d.projectId === where.projectId &&
            where.OR.some((cond: any) => cond.id === d.id || cond.type === d.type)
        ) || null
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `deliv_${Date.now()}`, ...data }
        mockDeliverablesStore.push(item)
        return item
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const item = mockDeliverablesStore.find((d) => d.id === where.id)
        if (item) {
          Object.assign(item, data)
        }
        return item
      })
    },
    deliverableVersion: {
      findMany: vi.fn(async ({ where, orderBy }: any) => {
        const filtered = mockVersionsStore.filter((v) => v.deliverableId === where.deliverableId)
        if (orderBy?.versionNumber === "desc") {
          return [...filtered].sort((a, b) => b.versionNumber - a.versionNumber)
        }
        return filtered
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return mockVersionsStore.find((v) => v.id === where.id) || null
      }),
      findFirst: vi.fn(async ({ where, orderBy }: any) => {
        const filtered = mockVersionsStore.filter((v) => v.deliverableId === where.deliverableId)
        if (orderBy?.versionNumber === "desc") {
          filtered.sort((a, b) => b.versionNumber - a.versionNumber)
        }
        return filtered[0] || null
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = {
          id: `ver_${Date.now()}_${Math.random()}`,
          ...data,
          createdAt: new Date(),
          createdBy: mockUser
        }
        mockVersionsStore.push(item)
        return item
      })
    },
    approval: {
      findMany: vi.fn(async ({ where }: any) => {
        return mockApprovalsStore.filter((a) => a.deliverableId === where.deliverableId)
      }),
      findUnique: vi.fn(async ({ where }: any) => {
        return mockApprovalsStore.find((a) => a.id === where.id) || null
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = {
          id: `app_${Date.now()}`,
          ...data,
          createdAt: new Date(),
          requestedBy: mockUser
        }
        mockApprovalsStore.push(item)
        return item
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const item = mockApprovalsStore.find((a) => a.id === where.id)
        if (item) {
          Object.assign(item, data)
          item.reviewer = mockReviewer
        }
        return item
      })
    },
    activityLog: {
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `act_${Date.now()}`, ...data, createdAt: new Date() }
        mockActivityLogsStore.push(item)
        return item
      })
    },
    notification: {
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `notif_${Date.now()}`, ...data, createdAt: new Date() }
        mockNotificationsStore.push(item)
        return item
      })
    },
    project: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id === "proj_phase11") {
          return {
            id: "proj_phase11",
            name: "Phase 11 Project",
            workspace: {
              organizationId: "org_phase11",
              organization: {
                memberships: [{ userId: mockUser.id }, { userId: mockReviewer.id }]
              }
            }
          }
        }
        return null
      })
    }
  }
}))

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    if (projectId === "unauthorized") {
      const err = new Error("Access Denied")
      err.name = "AccessError"
      throw err
    }
    return {
      user: mockUser,
      project: { id: projectId, workspace: { organizationId: "org_phase11" } }
    }
  })
}))

describe("Phase 11 — Deliverable Versioning, Diff & Approval Workflow", () => {
  beforeEach(() => {
    mockVersionsStore.length = 0
    mockApprovalsStore.length = 0
    mockActivityLogsStore.length = 0
    mockNotificationsStore.length = 0

    // Seed v1 and v2
    mockVersionsStore.push(
      {
        id: "v_1",
        deliverableId: "deliv_11",
        deliverable: mockDeliverablesStore[0],
        versionNumber: 1,
        content: { title: "Initial Spec v1", hero: "Welcome" },
        source: "AI",
        language: "en",
        createdById: mockUser.id,
        note: "Initial version",
        createdAt: new Date()
      },
      {
        id: "v_2",
        deliverableId: "deliv_11",
        deliverable: mockDeliverablesStore[0],
        versionNumber: 2,
        content: { title: "Updated Spec v2", hero: "Welcome to Enterprise AI" },
        source: "USER_EDIT",
        language: "en",
        createdById: mockUser.id,
        note: "Added hero section",
        createdAt: new Date()
      }
    )
  })

  describe("Deliverable Versions API", () => {
    it("should fetch versions for a deliverable (`GET /api/.../versions`)", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase11/deliverables/WEBSITE_SPEC/versions")
      const res = await getVersions(req, { params: { projectId: "proj_phase11", type: "WEBSITE_SPEC" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.versions.length).toBe(2)
      expect(body.versions[0].versionNumber).toBe(2)
    })

    it("should restore a previous version and create new version (`POST /api/.../restore`)", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase11/deliverables/WEBSITE_SPEC/versions/v_1/restore", {
        method: "POST"
      })
      const res = await restoreVersion(req, {
        params: { projectId: "proj_phase11", type: "WEBSITE_SPEC", versionId: "v_1" }
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.restoredVersion.versionNumber).toBe(3)
      expect(mockActivityLogsStore.some((a) => a.action === "version_restored")).toBe(true)
    })
  })

  describe("Deliverable Approval Workflow API", () => {
    it("should request formal review sign-off (`POST /api/.../approvals/request`)", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase11/deliverables/WEBSITE_SPEC/approvals/request", {
        method: "POST",
        body: JSON.stringify({ note: "Please verify section 2" })
      })
      const res = await requestApproval(req, { params: { projectId: "proj_phase11", type: "WEBSITE_SPEC" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.approval.status).toBe("PENDING")
      expect(mockDeliverablesStore[0].status).toBe("IN_REVIEW")
      expect(mockActivityLogsStore.some((a) => a.action === "approval_requested")).toBe(true)
    })

    it("should fetch approvals history (`GET /api/.../approvals`)", async () => {
      mockApprovalsStore.push({
        id: "app_1",
        deliverableId: "deliv_11",
        requestedById: mockUser.id,
        status: "PENDING",
        note: "Initial review",
        createdAt: new Date()
      })

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase11/deliverables/WEBSITE_SPEC/approvals")
      const res = await getApprovals(req, { params: { projectId: "proj_phase11", type: "WEBSITE_SPEC" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.approvals.length).toBe(1)
    })

    it("should action review status to APPROVED (`POST /api/.../approvals/[approvalId]`)", async () => {
      const appItem = {
        id: "app_1",
        deliverableId: "deliv_11",
        deliverable: mockDeliverablesStore[0],
        requestedById: mockUser.id,
        status: "PENDING",
        note: "Review please",
        createdAt: new Date()
      }
      mockApprovalsStore.push(appItem)

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase11/deliverables/WEBSITE_SPEC/approvals/app_1", {
        method: "POST",
        body: JSON.stringify({ status: "APPROVED", note: "Looks excellent!" })
      })

      const res = await actionApproval(req, {
        params: { projectId: "proj_phase11", type: "WEBSITE_SPEC", approvalId: "app_1" }
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.approval.status).toBe("APPROVED")
      expect(mockDeliverablesStore[0].status).toBe("APPROVED")
      expect(mockActivityLogsStore.some((a) => a.action === "approval_granted")).toBe(true)
    })
  })
})
