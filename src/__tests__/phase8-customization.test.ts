import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { applyBlueprintDelta, calculateRiskLevel, type BlueprintDelta } from "@/lib/ai/customization-engine"
import { POST as editBlueprint } from "@/app/api/projects/[projectId]/blueprint/edit/route"
import { GET as getChanges } from "@/app/api/projects/[projectId]/changes/route"
import { POST as approveChange } from "@/app/api/projects/[projectId]/changes/[changeId]/approve/route"
import { POST as rejectChange } from "@/app/api/projects/[projectId]/changes/[changeId]/reject/route"
import { POST as applyChange } from "@/app/api/projects/[projectId]/changes/[changeId]/apply/route"
import { POST as publishProject } from "@/app/api/projects/[projectId]/publish/route"

const { mockProjectRecord, mockChangeRecord, mockDeliverableRecord } = vi.hoisted(() => {
  const mockBlueprintData = {
    productOverview: "Enterprise Dental Clinic Software",
    businessObjective: "Automate patient check-in and doctor schedules",
    modules: [
      { key: "patients", name: "Patients", description: "Patient records management" },
      { key: "appointments", name: "Appointments", description: "Appointment schedule manager" }
    ],
    userRoles: [
      { role: "ADMIN", description: "Full system administration", permissions: ["manage_all"] }
    ],
    dataEntities: [
      {
        name: "Patients",
        fields: ["id", "name", "email", "phone", "status"]
      }
    ],
    workflows: []
  }

  const mockProjectRecord = {
    id: "proj_phase8",
    name: "Dental Clinic Platform",
    title: "Dental Clinic Platform",
    lifecycle: "READY_TO_DEPLOY",
    blueprintData: mockBlueprintData,
    organizationId: "org_1",
    language: "en",
    siteSlug: null,
    sitePublished: false,
    workspace: { organizationId: "org_1" }
  }

  const mockChangeRecord = {
    id: "change_123",
    projectId: "proj_phase8",
    prompt: "Add lead source field to Patients module",
    summary: "Add field 'leadSource' to Patients module",
    delta: {
      summary: "Add field 'leadSource' to Patients module",
      changes: [
        {
          type: "ADD_FIELD",
          module: "patients",
          field: { name: "leadSource", label: "Lead Source", type: "select" }
        }
      ],
      affectedModules: ["patients"],
      affectedDeliverables: ["SYSTEM_SPEC"],
      affectedRuntimeComponents: ["FORM", "TABLE"],
      riskLevel: "LOW",
      requiresApproval: true
    },
    impact: {
      affectedModules: ["patients"],
      affectedDeliverables: ["SYSTEM_SPEC"],
      affectedRuntimeComponents: ["FORM", "TABLE"]
    },
    riskLevel: "LOW",
    status: "PENDING",
    createdById: "user_test_1",
    createdAt: new Date(),
    appliedAt: null
  }

  const mockDeliverableRecord = {
    id: "deliv_123",
    projectId: "proj_phase8",
    type: "SYSTEM_SPEC",
    title: "System Architecture Specification",
    status: "APPROVED",
    versions: []
  }

  return { mockProjectRecord, mockChangeRecord, mockDeliverableRecord }
})

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockImplementation((projectId) => {
    if (projectId === "unauthorized") {
      throw new Error("Access Denied: Missing permissions")
    }
    return Promise.resolve({
      user: { id: "user_test_1", role: "ADMIN" },
      project: { id: projectId, workspace: { organizationId: "org_1" } }
    })
  })
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const changesStore: any[] = []
let currentProject = { ...mockProjectRecord }

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === currentProject.id) return Promise.resolve(currentProject)
        return Promise.resolve(null)
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        if (where.id === currentProject.id) {
          currentProject = { ...currentProject, ...data }
          return Promise.resolve(currentProject)
        }
        return Promise.resolve(null)
      })
    },
    blueprintChange: {
      create: vi.fn().mockImplementation(({ data }) => {
        const record = { id: `change_${Date.now()}`, ...data, createdAt: new Date() }
        changesStore.push(record)
        return Promise.resolve(record)
      }),
      findMany: vi.fn().mockImplementation(({ where }) => {
        return Promise.resolve(changesStore.filter((c) => c.projectId === where.projectId))
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => {
        const found = changesStore.find((c) => c.id === where.id && c.projectId === where.projectId)
        return Promise.resolve(found || null)
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const idx = changesStore.findIndex((c) => c.id === where.id)
        if (idx >= 0) {
          changesStore[idx] = { ...changesStore[idx], ...data }
          return Promise.resolve(changesStore[idx])
        }
        return Promise.resolve(null)
      })
    },
    deliverable: {
      findFirst: vi.fn().mockImplementation(() => Promise.resolve(mockDeliverableRecord)),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "deliv_999", ...data, versions: [] })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...mockDeliverableRecord, ...data }))
    },
    deliverableVersion: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "ver_123", ...data }))
    },
    activityLog: {
      create: vi.fn().mockResolvedValue({ id: "log_123" })
    },
    aiUsage: {
      create: vi.fn().mockResolvedValue({ id: "usage_123" })
    }
  }
}))

describe("Phase 8 — AI Natural-Language Customization & Publishing", () => {
  beforeEach(() => {
    changesStore.length = 0
    changesStore.push({ ...mockChangeRecord })
    currentProject = { ...mockProjectRecord }
  })

  describe("Deterministic Delta Application Unit Tests", () => {
    it("should deterministically add field to matching data entity", () => {
      const baseBp = { ...mockProjectRecord.blueprintData }
      const delta: BlueprintDelta = {
        summary: "Add referral_code field",
        changes: [
          {
            type: "ADD_FIELD",
            module: "patients",
            field: { name: "referral_code", label: "Referral Code", type: "text" }
          }
        ],
        affectedModules: ["patients"],
        affectedDeliverables: ["SYSTEM_SPEC"],
        affectedRuntimeComponents: ["FORM"],
        riskLevel: "LOW",
        requiresApproval: true
      }

      const updated = applyBlueprintDelta(baseBp, delta)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patientEntity = updated.dataEntities.find((e: any) => e.name.toLowerCase() === "patients")
      expect(patientEntity.fields).toContain("referral_code")
    })

    it("should calculate HIGH risk level for destructive change types", () => {
      const risk = calculateRiskLevel([
        { type: "REMOVE_MODULE", module: "appointments" }
      ])
      expect(risk).toBe("HIGH")
    })
  })

  describe("AI Customization Edit Proposal API", () => {
    it("should generate a structured delta proposal and save BlueprintChange record", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/blueprint/edit", {
        method: "POST",
        body: JSON.stringify({ prompt: "Add lead_source field to patients module" })
      })

      const res = await editBlueprint(req, { params: { projectId: "proj_phase8" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.change.status).toBe("PENDING")
      expect(body.change.delta.changes.length).toBeGreaterThan(0)
    })

    it("should reject empty prompt with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/blueprint/edit", {
        method: "POST",
        body: JSON.stringify({ prompt: "   " })
      })

      const res = await editBlueprint(req, { params: { projectId: "proj_phase8" } })
      expect(res.status).toBe(400)
    })
  })

  describe("Proposal Management & Approval Flow", () => {
    it("should list change proposals for a project", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/changes")
      const res = await getChanges(req, { params: { projectId: "proj_phase8" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.changes.length).toBe(1)
    })

    it("should approve a pending change proposal", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/changes/change_123/approve", {
        method: "POST"
      })
      const res = await approveChange(req, { params: { projectId: "proj_phase8", changeId: "change_123" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.change.status).toBe("APPROVED")
    })

    it("should reject a pending change proposal", async () => {
      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/changes/change_123/reject", {
        method: "POST"
      })
      const res = await rejectChange(req, { params: { projectId: "proj_phase8", changeId: "change_123" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.change.status).toBe("REJECTED")
    })
  })

  describe("Applying Approved Delta & Regeneration", () => {
    it("should apply approved delta, update blueprint, create deliverable version, and update status to APPLIED", async () => {
      // Approve first
      changesStore[0].status = "APPROVED"

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/changes/change_123/apply", {
        method: "POST"
      })
      const res = await applyChange(req, { params: { projectId: "proj_phase8", changeId: "change_123" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.change.status).toBe("APPLIED")
      expect(currentProject.lifecycle).toBe("READY_TO_DEPLOY")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patientEntity = body.blueprint.dataEntities.find((e: any) => e.name.toLowerCase() === "patients")
      expect(patientEntity.fields).toContain("leadSource")
    })
  })

  describe("Publishing & LIVE Lifecycle Transition", () => {
    it("should transition project lifecycle from READY_TO_DEPLOY to LIVE and generate site slug", async () => {
      currentProject.lifecycle = "READY_TO_DEPLOY"

      const req = new NextRequest("http://localhost:3000/api/projects/proj_phase8/publish", {
        method: "POST"
      })
      const res = await publishProject(req, { params: { projectId: "proj_phase8" } })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.ok).toBe(true)
      expect(body.lifecycle).toBe("LIVE")
      expect(body.siteSlug).toContain("dental-clinic-platform")
      expect(currentProject.sitePublished).toBe(true)
    })
  })
})
