/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export type BackendMode = "NONE" | "SHARED" | "DEDICATED"

export interface RenderServiceRecord {
  id: string
  url?: string
}

export interface RenderDeploymentResult {
  id: string
  url?: string
  status: "BUILDING" | "READY" | "FAILED" | "NOT_CONFIGURED" | "NOT_REQUIRED"
  error?: string
}

export class RenderDeploymentProvider {
  name = "Render"

  public isConfigured(): boolean {
    return Boolean(process.env.RENDER_API_KEY)
  }

  /**
   * Dynamically create a dedicated Render web service for a project.
   */
  public async createService(projectName: string, _spec: WebsiteSpecData): Promise<RenderServiceRecord> {
    if (!this.isConfigured()) {
      return { id: `srv_mock_${Date.now()}`, url: `https://api-${projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.onrender.com` }
    }

    const slug = projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")
    try {
      const response = await fetch("https://api.render.com/v1/services", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: "web_service",
          name: slug,
          env: "node",
          autoDeploy: "yes"
        })
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Render Create Service failed (${response.status}): ${err}`)
      }

      const data = await response.json()
      return {
        id: data.id || `srv_${Date.now()}`,
        url: data.serviceDetails?.url
      }
    } catch (err: any) {
      console.warn("[RenderDeploymentProvider] createService fallback:", err.message)
      return { id: `srv_mock_${Date.now()}`, url: `https://api-${slug}.onrender.com` }
    }
  }

  /**
   * Deploy backend service according to specified Backend Mode (NONE, SHARED, DEDICATED).
   */
  public async deploy(
    project: { id: string; renderServiceId?: string | null; name: string; backendMode?: BackendMode },
    _branch: string,
    spec: WebsiteSpecData
  ): Promise<RenderDeploymentResult> {
    const mode = project.backendMode || "NONE"

    if (mode === "NONE") {
      return {
        id: `dep_render_none_${Date.now()}`,
        status: "NOT_REQUIRED"
      }
    }

    if (mode === "SHARED") {
      return {
        id: `dep_render_shared_${Date.now()}`,
        url: "https://api-shared.onrender.com",
        status: "READY"
      }
    }

    // DEDICATED Backend Mode
    if (!this.isConfigured()) {
      return {
        id: `dep_render_unconfig_${Date.now()}`,
        status: "NOT_CONFIGURED",
        error: "RENDER_API_KEY environment variable is not configured."
      }
    }

    const targetServiceId = project.renderServiceId || (await this.createService(project.name, spec)).id

    try {
      const response = await fetch(`https://api.render.com/v1/services/${targetServiceId}/deploys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ clearCache: "do_not_clear" })
      })

      if (!response.ok) {
        const errText = await response.text()
        return {
          id: `dep_render_err_${Date.now()}`,
          status: "FAILED",
          error: `Render API Error (${response.status}): ${errText}`
        }
      }

      const data = await response.json()
      return {
        id: data.id || `dep_render_${Date.now()}`,
        url: data.deploy?.url,
        status: "READY"
      }
    } catch (err: any) {
      return {
        id: `dep_render_err_${Date.now()}`,
        status: "FAILED",
        error: err.message || "Network error deploying to Render."
      }
    }
  }

  /**
   * Delete a Render Web Service.
   */
  public async deleteService(renderServiceId: string): Promise<boolean> {
    if (!this.isConfigured()) return false
    try {
      const response = await fetch(`https://api.render.com/v1/services/${renderServiceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` }
      })
      return response.ok
    } catch {
      return false
    }
  }
}
