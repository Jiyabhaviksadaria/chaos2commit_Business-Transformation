import { describe, it, expect } from "vitest"
import { DeploymentManager } from "@/lib/deployment/deployment-provider"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 7: Vercel & Render Deployment Providers (Refactored Architecture)", () => {
  it("should deploy isolated preview and production environments per project with NONE backend mode", async () => {
    const spec = buildWebsiteSpecFromTemplate("clinic")
    const manager = new DeploymentManager()

    const projectA = {
      id: "proj-clinic-01",
      name: "Apex Dental Clinic",
      vercelProjectId: "prj_clinic_01_id",
      backendMode: "NONE" as const
    }

    const preview = await manager.deployPreview(projectA, "feature/project-proj-clinic-01", spec)
    expect(preview.frontend.provider).toBe("VERCEL")
    expect(preview.frontend.environment).toBe("PREVIEW")
    expect(preview.backend.status).toBe("NOT_REQUIRED")

    const prod = await manager.deployProduction(projectA, "main", spec)
    expect(prod.frontend.environment).toBe("PRODUCTION")
  })

  it("should support separate Vercel and Render IDs for Project A and Project B without global target collisions", async () => {
    const spec = buildWebsiteSpecFromTemplate("restaurant")
    const manager = new DeploymentManager()

    const projectA = { id: "p1", name: "Bistro A", vercelProjectId: "v_proj_a", renderServiceId: "r_srv_a", backendMode: "DEDICATED" as const }
    const projectB = { id: "p2", name: "Bistro B", vercelProjectId: "v_proj_b", renderServiceId: "r_srv_b", backendMode: "SHARED" as const }

    const resA = await manager.deployPreview(projectA, "feature/p1", spec)
    const resB = await manager.deployPreview(projectB, "feature/p2", spec)

    expect(resA.frontend.projectId).toBe("p1")
    expect(resB.frontend.projectId).toBe("p2")
    expect(resB.backend.url).toBe("https://api-shared.onrender.com")
  })
})
