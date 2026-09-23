/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST as analyzeExisting } from "@/app/api/projects/[projectId]/analyze-existing/route"
import { GET as getIntegrations, POST as updateIntegration } from "@/app/api/projects/[projectId]/integrations/route"

const mockProjectStore: Record<string, any> = {
  "proj_15": {
    id: "proj_15",
    title: "Legacy ERP Modernization",
    workspace: { organizationId: "org_15" }
  }
}

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(async (projectId: string) => {
    const project = mockProjectStore[projectId]
    if (!project) throw new Error("Project not found")
    return {
      user: { id: "user_dev", role: "ADMIN" },
      project
    }
  })
}))

vi.mock("@/lib/db", () => ({
  db: {
    activityLog: {
      create: vi.fn(async () => ({ id: "act_15" }))
    }
  }
}))

describe("Phase 15 — Existing Application Analysis & Enterprise Integrations Framework", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should analyze legacy application technical debt (`POST /api/projects/[projectId]/analyze-existing`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_15/analyze-existing", {
      method: "POST",
      body: JSON.stringify({
        repoUrl: "https://github.com/enterprise/legacy-erp",
        techStack: ["Java 8", "Oracle DB", "Struts 2"],
        description: "Monolithic ERP application needing cloud microservices modernization."
      })
    })

    const res = await analyzeExisting(req, { params: { projectId: "proj_15" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.analysis.technicalDebtScore).toBeGreaterThan(0)
    expect(body.analysis.recommendations.length).toBeGreaterThan(0)
  })

  it("should fetch enterprise integration status catalog (`GET /api/projects/[projectId]/integrations`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_15/integrations")
    const res = await getIntegrations(req, { params: { projectId: "proj_15" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.integrations.length).toBe(5)
    expect(body.integrations[0].key).toBe("github")
  })

  it("should toggle enterprise integration connection status (`POST /api/projects/[projectId]/integrations`)", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/proj_15/integrations", {
      method: "POST",
      body: JSON.stringify({ integrationId: "int_jira", status: "CONNECTED" })
    })

    const res = await updateIntegration(req, { params: { projectId: "proj_15" } })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    const jira = body.integrations.find((i: any) => i.id === "int_jira")
    expect(jira.status).toBe("CONNECTED")
  })
})
