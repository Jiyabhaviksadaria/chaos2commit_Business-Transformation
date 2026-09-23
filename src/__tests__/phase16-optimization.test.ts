/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET as getOptimizations, POST as applyOptimization } from "@/app/api/projects/[projectId]/optimization/route"

const mockProjectStore: Record<string, any> = {
  "proj_16": {
    id: "proj_16",
    title: "High Throughput Logistics Platform",
    workspace: { organizationId: "org_16" }
  }
}

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    const project = mockProjectStore[projectId]
    if (!project) throw new Error("Project not found")
    return {
      user: { id: "user_opt", role: "ADMIN" },
      project
    }
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      create: vi.fn(async () => ({ id: "act_opt_1" }))
    }
  }
}))

describe("Phase 16 — AI Continuous Optimization Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should scan project and fetch optimization recommendations (`GET /api/projects/[projectId]/optimization`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_16/optimization")
    const res = await getOptimizations(req, { params: { projectId: "proj_16" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.optimizationScore).toBeGreaterThan(0)
    expect(body.recommendations.length).toBeGreaterThan(0)
  })

  it("should apply an optimization recommendation (`POST /api/projects/[projectId]/optimization`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_16/optimization", {
      method: "POST",
      body: JSON.stringify({ recommendationId: "opt_1" })
    })

    const res = await applyOptimization(req, { params: { projectId: "proj_16" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.appliedRecommendation.status).toBe("APPLIED")
  })
})
