/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST as executeRuntime } from "@/app/api/projects/[projectId]/runtime/execute/route"

const mockProjectStore: Record<string, any> = {
  "proj_17": {
    id: "proj_17",
    title: "Real-time Order Processing Engine",
    workspace: { organizationId: "org_17" }
  }
}

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    const project = mockProjectStore[projectId]
    if (!project) throw new Error("Project not found")
    return {
      user: { id: "user_runtime", role: "ADMIN" },
      project
    }
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      create: vi.fn(async () => ({ id: "act_rt_1" }))
    }
  }
}))

describe("Phase 17 — Advanced System Runtime Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should execute custom business script payload (`POST /api/projects/[projectId]/runtime/execute`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_17/runtime/execute", {
      method: "POST",
      body: JSON.stringify({
        actionType: "SCRIPT",
        moduleKey: "orders",
        inputData: { orderId: "ord_100", amount: 250 }
      })
    })

    const res = await executeRuntime(req, { params: { projectId: "proj_17" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.outputData.computedStatus).toBe("SUCCESS")
    expect(body.executionTimeMs).toBeGreaterThanOrEqual(0)
  })

  it("should execute workflow state transition payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_17/runtime/execute", {
      method: "POST",
      body: JSON.stringify({
        actionType: "STATE_TRANSITION",
        moduleKey: "approvals",
        currentState: "PENDING",
        nextState: "APPROVED"
      })
    })

    const res = await executeRuntime(req, { params: { projectId: "proj_17" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.status).toBe("APPROVED")
    expect(body.result.transition).toBe("PENDING -> APPROVED")
  })

  it("should execute CSV stream transformation payload", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_17/runtime/execute", {
      method: "POST",
      body: JSON.stringify({
        actionType: "CSV_STREAM",
        moduleKey: "data_import",
        inputData: [{ name: "Alice", email: "alice@example.com" }, { name: "Bob", email: "bob@example.com" }]
      })
    })

    const res = await executeRuntime(req, { params: { projectId: "proj_17" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.result.processedCount).toBe(2)
  })
})
