/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET as getStats } from "@/app/api/admin/stats/route"
import { GET as getModels, POST as updateModels } from "@/app/api/admin/models/route"
import { GET as getUsers } from "@/app/api/admin/users/route"
import { GET as getAudit } from "@/app/api/admin/audit/route"

const mockUsersStore = [
  { id: "u_1", name: "Jiya Admin", email: "admin@enterprise.com", role: "ADMIN", createdAt: new Date() }
]

const mockAuditLogsStore = [
  { id: "a_1", action: "export_generated", entity: "Export", createdAt: new Date() }
]

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: vi.fn(async () => mockUsersStore.length),
      findMany: vi.fn(async () => mockUsersStore)
    },
    organization: {
      count: vi.fn(async () => 5)
    },
    project: {
      count: vi.fn(async () => 12)
    },
    deliverable: {
      count: vi.fn(async () => 48)
    },
    activityLog: {
      count: vi.fn(async () => mockAuditLogsStore.length),
      findMany: vi.fn(async () => mockAuditLogsStore)
    }
  }
}))

describe("Phase 13 — Enterprise Admin Suite & AI Model Management", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should fetch system-wide admin stats (`GET /api/admin/stats`)", async () => {
    const res = await getStats()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.stats.usersCount).toBe(1)
    expect(body.stats.projectsCount).toBe(12)
  })

  it("should fetch AI model provider configurations (`GET /api/admin/models`)", async () => {
    const res = await getModels()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.models.length).toBeGreaterThan(0)
    expect(body.models[0].provider).toBe("Google Gemini")
  })

  it("should update AI model provider configuration (`POST /api/admin/models`)", async () => {
    const updated = [
      {
        provider: "Google Gemini",
        model: "gemini-1.5-pro",
        status: "PRIMARY",
        temperature: 0.1,
        maxTokens: 16384,
        fallbackPriority: 1,
        creditRate: 1.0,
        apiStatus: "HEALTHY"
      }
    ]

    const req = new NextRequest("http://localhost:3000/api/admin/models", {
      method: "POST",
      body: JSON.stringify({ models: updated })
    })

    const res = await updateModels(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.models[0].maxTokens).toBe(16384)
  })

  it("should fetch user governance directory (`GET /api/admin/users`)", async () => {
    const res = await getUsers()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.users.length).toBe(1)
    expect(body.users[0].email).toBe("admin@enterprise.com")
  })

  it("should fetch global audit security logs (`GET /api/admin/audit`)", async () => {
    const res = await getAudit()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.logs.length).toBe(1)
    expect(body.logs[0].action).toBe("export_generated")
  })
})
