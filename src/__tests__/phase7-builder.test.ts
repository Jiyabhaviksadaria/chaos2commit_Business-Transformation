import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import "@/modules/registry"
import { GET as getRecords, POST as createRecord } from "@/app/api/projects/[projectId]/records/[moduleKey]/route"
import { GET as getBlueprint } from "@/app/api/projects/[projectId]/blueprint/route"

const { mockCreatedRecord, mockProjectRecord } = vi.hoisted(() => {
  const mockBlueprintData = {
    productOverview: "Enterprise Dental Clinic Software",
    businessObjective: "Automate patient check-in and doctor schedules",
    modules: [
      { key: "patients", name: "Patients", description: "Patient records management" },
      { key: "appointments", name: "Appointments", description: "Appointment schedule manager" }
    ],
    userRoles: [
      { role: "ADMIN", description: "Full system administration", permissions: ["manage_all"] },
      { role: "STAFF", description: "Reception and scheduling", permissions: ["view_patients", "edit_appointments"] }
    ],
    requirements: [
      { id: "REQ-01", title: "Patient Registration", category: "KNOWN", description: "Register patient demography" }
    ],
    dataEntities: [
      {
        name: "Patients",
        fields: ["id", "name", "email", "phone", "status", "created_at"]
      }
    ]
  }

  const mockProjectRecord = {
    id: "proj_phase7",
    title: "Test Builder Project",
    lifecycle: "BUILDING",
    blueprintData: mockBlueprintData,
    organizationId: "org_1",
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockCreatedRecord = {
    id: "rec_123",
    projectId: "proj_phase7",
    moduleKey: "patients",
    data: { name: "Jane Doe", status: "ACTIVE", email: "jane@clinic.com" },
    createdById: "user_test_1",
    createdAt: new Date(),
    updatedAt: new Date()
  }

  return { mockCreatedRecord, mockProjectRecord }
})

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn().mockImplementation((projectId) => {
    if (projectId === "unauthorized") {
      throw new Error("Access Denied: Missing permissions")
    }
    return Promise.resolve({
      user: { id: "user_test_1", role: "ADMIN", organizationId: "org_1" },
      project: { id: projectId, title: "Test Builder Project" }
    })
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findUnique: vi.fn().mockImplementation(({ where }) => {
        if (where.id === "proj_phase7") return Promise.resolve(mockProjectRecord)
        if (where.id === "proj_empty_bp") return Promise.resolve({ id: "proj_empty_bp", blueprintData: null })
        return Promise.resolve(null)
      })
    },
    deliverable: {
      findFirst: vi.fn().mockResolvedValue(null)
    },
    generatedRecord: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([mockCreatedRecord]),
      create: vi.fn().mockResolvedValue(mockCreatedRecord)
    }
  }
}))

describe("Phase 7: Automated Software Builder & Dynamic Runtime Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("1. Ingests Master Blueprint and returns current lifecycle state", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_phase7/blueprint")
    const res = await getBlueprint(req, { params: { projectId: "proj_phase7" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.lifecycle).toBe("BUILDING")
    expect(body.blueprint.productOverview).toContain("Dental Clinic")
  })

  it("2. Dynamically resolves module schema from Blueprint dataEntities", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_phase7/records/patients?page=1")
    const res = await getRecords(req, { params: { projectId: "proj_phase7", moduleKey: "patients" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toBeDefined()
  })

  it("3. Handles missing blueprint gracefully with generic module fallback", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_empty_bp/records/unknown_module?page=1")
    const res = await getRecords(req, { params: { projectId: "proj_empty_bp", moduleKey: "unknown_module" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("4. Fetches record collection for a blueprint module (GET)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_phase7/records/patients?page=1&pageSize=20")
    const res = await getRecords(req, { params: { projectId: "proj_phase7", moduleKey: "patients" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.total).toBe(1)
    expect(body.data[0].data.name).toBe("Jane Doe")
  })

  it("5. Creates a record for a blueprint module with validation (POST)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_phase7/records/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John Smith", status: "ACTIVE" })
    })

    const res = await createRecord(req, { params: { projectId: "proj_phase7", moduleKey: "patients" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data.data.name).toBe("Jane Doe")
  })

  it("6. Fails record creation if required fields are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_phase7/records/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "only_email@clinic.com" })
    })

    const res = await createRecord(req, { params: { projectId: "proj_phase7", moduleKey: "patients" } })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.ok).toBe(false)
    expect(body.error).toContain("is required")
  })

  it("7. Blocks unauthorized access to record APIs", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/unauthorized/records/patients")
    const res = await getRecords(req, { params: { projectId: "unauthorized", moduleKey: "patients" } })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.ok).toBe(false)
    expect(body.error).toContain("Access Denied")
  })
})
