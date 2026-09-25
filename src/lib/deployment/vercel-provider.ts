/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export interface VercelProjectRecord {
  id: string
  name: string
}

export interface VercelDeploymentResult {
  id: string
  url?: string
  status: "BUILDING" | "READY" | "FAILED" | "NOT_CONFIGURED"
  error?: string
}

export class VercelDeploymentProvider {
  name = "Vercel"

  public isConfigured(): boolean {
    return Boolean(process.env.VERCEL_TOKEN)
  }

  /**
   * Create an isolated Vercel project for a specific user website project.
   */
  public async createProject(projectName: string, _spec: WebsiteSpecData): Promise<VercelProjectRecord> {
    if (!this.isConfigured()) {
      return {
        id: `prj_mock_${Date.now()}`,
        name: projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")
      }
    }

    const slugName = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")
    try {
      const response = await fetch("https://api.vercel.com/v9/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: slugName,
          framework: "nextjs"
        })
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Vercel Create Project failed (${response.status}): ${err}`)
      }

      const data = await response.json()
      return {
        id: data.id,
        name: data.name
      }
    } catch (err: any) {
      console.warn("[VercelDeploymentProvider] createProject fallback:", err.message)
      return {
        id: `prj_mock_${Date.now()}`,
        name: slugName
      }
    }
  }

  /**
   * Trigger a Preview deployment for a specific Vercel project ID.
   */
  public async deployPreview(
    project: { id: string; vercelProjectId?: string | null; name: string },
    branch: string,
    spec: WebsiteSpecData
  ): Promise<VercelDeploymentResult> {
    if (!this.isConfigured()) {
      return {
        id: `dep_vcl_prev_${Date.now()}`,
        status: "NOT_CONFIGURED",
        error: "VERCEL_TOKEN environment variable is not configured."
      }
    }

    const targetProjectId = project.vercelProjectId || (await this.createProject(project.name, spec)).id

    try {
      const response = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: project.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          project: targetProjectId,
          target: "preview",
          gitSource: {
            type: "github",
            ref: branch
          },
          metadata: {
            siteName: spec.siteName,
            internalProjectId: project.id
          }
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        return {
          id: `dep_vcl_err_${Date.now()}`,
          status: "FAILED",
          error: `Vercel Preview API Error (${response.status}): ${errText}`
        }
      }

      const data = await response.json()
      return {
        id: data.id,
        url: data.url ? `https://${data.url}` : undefined,
        status: data.readyState === "READY" ? "READY" : "BUILDING"
      }
    } catch (err: any) {
      return {
        id: `dep_vcl_err_${Date.now()}`,
        status: "FAILED",
        error: err.message || "Network error deploying to Vercel Preview."
      }
    }
  }

  /**
   * Trigger a Production deployment for a specific Vercel project ID.
   */
  public async deployProduction(
    project: { id: string; vercelProjectId?: string | null; name: string },
    branch: string,
    spec: WebsiteSpecData
  ): Promise<VercelDeploymentResult> {
    if (!this.isConfigured()) {
      return {
        id: `dep_vcl_prod_${Date.now()}`,
        status: "NOT_CONFIGURED",
        error: "VERCEL_TOKEN environment variable is not configured."
      }
    }

    const targetProjectId = project.vercelProjectId || (await this.createProject(project.name, spec)).id

    try {
      const response = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: project.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          project: targetProjectId,
          target: "production",
          gitSource: {
            type: "github",
            ref: branch
          },
          metadata: {
            siteName: spec.siteName,
            internalProjectId: project.id
          }
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        return {
          id: `dep_vcl_err_${Date.now()}`,
          status: "FAILED",
          error: `Vercel Production API Error (${response.status}): ${errText}`
        }
      }

      const data = await response.json()
      return {
        id: data.id,
        url: data.url ? `https://${data.url}` : undefined,
        status: data.readyState === "READY" ? "READY" : "BUILDING"
      }
    } catch (err: any) {
      return {
        id: `dep_vcl_err_${Date.now()}`,
        status: "FAILED",
        error: err.message || "Network error deploying to Vercel Production."
      }
    }
  }

  /**
   * Get real status for a specific Vercel deployment ID.
   */
  public async getDeploymentStatus(deploymentId: string): Promise<VercelDeploymentResult> {
    if (!this.isConfigured()) {
      return { id: deploymentId, status: "NOT_CONFIGURED" }
    }

    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
      })

      if (!response.ok) {
        return { id: deploymentId, status: "FAILED", error: `HTTP ${response.status}` }
      }

      const data = await response.json()
      return {
        id: data.id,
        url: data.url ? `https://${data.url}` : undefined,
        status: data.readyState === "READY" ? "READY" : data.readyState === "ERROR" ? "FAILED" : "BUILDING"
      }
    } catch (err: any) {
      return { id: deploymentId, status: "FAILED", error: err.message }
    }
  }

  /**
   * Rollback a Vercel project to a previous deployment.
   */
  public async rollback(vercelProjectId: string, deploymentId: string): Promise<boolean> {
    if (!this.isConfigured()) return false
    try {
      const response = await fetch(`https://api.vercel.com/v9/projects/${vercelProjectId}/rollback/${deploymentId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
