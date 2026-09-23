/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { VercelDeploymentProvider, VercelDeploymentResult } from "@/lib/deployment/vercel-provider"
import { RenderDeploymentProvider, RenderDeploymentResult, BackendMode } from "@/lib/deployment/render-provider"

export { VercelDeploymentProvider, RenderDeploymentProvider }

export type DeploymentStatus =
  | "NOT_CONFIGURED"
  | "QUEUED"
  | "BUILDING"
  | "DEPLOYING"
  | "READY"
  | "FAILED"
  | "HEALTH_CHECK_FAILED"

export interface DeploymentRecord {
  id: string
  projectId: string
  provider: "VERCEL" | "RENDER"
  environment: "PREVIEW" | "PRODUCTION"
  branch: string
  status: DeploymentStatus
  url?: string
  deployedAt: string
  error?: string
  setupInstructions?: string
}

export interface DeploymentProjectInfo {
  id: string
  name: string
  vercelProjectId?: string | null
  renderServiceId?: string | null
  backendMode?: BackendMode
}

export class DeploymentManager {
  private vercelProvider = new VercelDeploymentProvider()
  private renderProvider = new RenderDeploymentProvider()

  public isVercelConfigured(): boolean {
    return this.vercelProvider.isConfigured()
  }

  public isRenderConfigured(): boolean {
    return this.renderProvider.isConfigured()
  }

  /**
   * Deploys preview environments for Vercel (Frontend) and Render (Backend).
   */
  public async deployPreview(
    project: DeploymentProjectInfo,
    branch: string,
    spec: WebsiteSpecData
  ): Promise<{ frontend: DeploymentRecord; backend: DeploymentRecord }> {
    const vRes: VercelDeploymentResult = await this.vercelProvider.deployPreview(project, branch, spec)
    const rRes: RenderDeploymentResult = await this.renderProvider.deploy(project, branch, spec)

    const frontend: DeploymentRecord = {
      id: vRes.id,
      projectId: project.id,
      provider: "VERCEL",
      environment: "PREVIEW",
      branch,
      status: vRes.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : vRes.status === "FAILED" ? "FAILED" : "READY",
      url: vRes.url,
      deployedAt: new Date().toISOString(),
      error: vRes.error,
      setupInstructions: vRes.status === "NOT_CONFIGURED" ? "Set VERCEL_TOKEN in environment variables (.env)." : undefined
    }

    const backendStatus: DeploymentStatus =
      rRes.status === "NOT_REQUIRED" ? "NOT_REQUIRED" as any : rRes.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : rRes.status === "FAILED" ? "FAILED" : "READY"

    const backend: DeploymentRecord = {
      id: rRes.id,
      projectId: project.id,
      provider: "RENDER",
      environment: "PREVIEW",
      branch,
      status: backendStatus,
      url: rRes.url,
      deployedAt: new Date().toISOString(),
      error: rRes.error,
      setupInstructions: rRes.status === "NOT_CONFIGURED" ? "Set RENDER_API_KEY in environment variables (.env)." : undefined
    }

    return { frontend, backend }
  }

  /**
   * Deploys production environments upon User Approval.
   */
  public async deployProduction(
    project: DeploymentProjectInfo,
    branch: string,
    spec: WebsiteSpecData
  ): Promise<{ frontend: DeploymentRecord; backend: DeploymentRecord }> {
    const vRes: VercelDeploymentResult = await this.vercelProvider.deployProduction(project, branch, spec)
    const rRes: RenderDeploymentResult = await this.renderProvider.deploy(project, branch, spec)

    const frontend: DeploymentRecord = {
      id: vRes.id,
      projectId: project.id,
      provider: "VERCEL",
      environment: "PRODUCTION",
      branch,
      status: vRes.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : vRes.status === "FAILED" ? "FAILED" : "READY",
      url: vRes.url,
      deployedAt: new Date().toISOString(),
      error: vRes.error,
      setupInstructions: vRes.status === "NOT_CONFIGURED" ? "Set VERCEL_TOKEN in environment variables (.env)." : undefined
    }

    const backendStatus: DeploymentStatus =
      rRes.status === "NOT_REQUIRED" ? "NOT_REQUIRED" as any : rRes.status === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : rRes.status === "FAILED" ? "FAILED" : "READY"

    const backend: DeploymentRecord = {
      id: rRes.id,
      projectId: project.id,
      provider: "RENDER",
      environment: "PRODUCTION",
      branch,
      status: backendStatus,
      url: rRes.url,
      deployedAt: new Date().toISOString(),
      error: rRes.error,
      setupInstructions: rRes.status === "NOT_CONFIGURED" ? "Set RENDER_API_KEY in environment variables (.env)." : undefined
    }

    return { frontend, backend }
  }
}
