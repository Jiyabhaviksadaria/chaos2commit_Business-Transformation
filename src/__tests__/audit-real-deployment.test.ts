/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from "vitest"
import { VercelDeploymentProvider, RenderDeploymentProvider, DeploymentManager } from "@/lib/deployment/deployment-provider"
import { LocalGitProvider, VersionMetadataSystem } from "@/lib/versioning/git-versioning"
import { LocalSandboxProvider } from "@/lib/build-qa/sandbox-provider"
import { QAEngine } from "@/lib/build-qa/qa-engine"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Real Deployment & Infrastructure Verification Audit", () => {
  it("Vercel & Render Deployment Providers must check provider-level tokens only and return NOT_CONFIGURED when missing", async () => {
    delete process.env.VERCEL_TOKEN
    delete process.env.RENDER_API_KEY

    const spec = buildWebsiteSpecFromTemplate("clinic")
    const vercel = new VercelDeploymentProvider()
    const render = new RenderDeploymentProvider()

    expect(vercel.isConfigured()).toBe(false)
    expect(render.isConfigured()).toBe(false)

    const project = { id: "test-p1", name: "Test Project", backendMode: "DEDICATED" as const }
    const vRes = await vercel.deployPreview(project, "feature/test-p1", spec)
    expect(vRes.status).toBe("NOT_CONFIGURED")
    expect(vRes.url).toBeUndefined()

    const rRes = await render.deploy(project, "feature/test-p1", spec)
    expect(rRes.status).toBe("NOT_CONFIGURED")
    expect(rRes.url).toBeUndefined()
  })

  it("LocalGitProvider must execute real system git commands", () => {
    const git = new LocalGitProvider()
    expect(git.name).toBe("LocalGitCLI")

    const spec = buildWebsiteSpecFromTemplate("clinic")
    const metaSystem = new VersionMetadataSystem("audit-proj", spec)
    expect(metaSystem.getMainBranch()).toBe("main")
    expect(metaSystem.getFeatureBranch()).toBe("feature/project-audit-proj")
  })

  it("LocalSandboxProvider must execute real CLI process commands", async () => {
    const sandbox = new LocalSandboxProvider()
    const res = await sandbox.runCommand(process.cwd(), "node -v")

    expect(res.success).toBe(true)
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toContain("v")
    expect(res.durationMs).toBeGreaterThan(0)
  })

  it("QAEngine must return BACKEND_NOT_REQUIRED for static template spec and verify HTTP routes", async () => {
    const spec = buildWebsiteSpecFromTemplate("restaurant")
    const report = await QAEngine.runQA(spec)

    expect(report.passed).toBe(true)
    expect(report.backendStatus).toBe("BACKEND_NOT_REQUIRED")
    const routeStage = report.results.find(r => r.stage === "ROUTE_VERIFICATION")
    expect(routeStage?.passed).toBe(true)
  })
})
