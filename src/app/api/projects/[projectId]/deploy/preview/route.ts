/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { DeploymentManager } from "@/lib/deployment/deployment-provider"
import { QAEngine } from "@/lib/build-qa/qa-engine"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const project: any = await db.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Spec resolution
    const templateId = project.blueprintData?.templateId || "clinic"
    const spec = project.blueprintData?.spec || buildWebsiteSpecFromTemplate(templateId)

    // Run 6-stage QA Engine
    const qaReport = await QAEngine.runQA(spec)
    if (!qaReport.passed) {
      return NextResponse.json(
        {
          error: "QA Engine check failed. Preview deployment aborted.",
          qaReport
        },
        { status: 400 }
      )
    }

    const deployManager = new DeploymentManager()
    const branch = project.gitBranch || `feature/project-${project.id}`

    const deployResult = await deployManager.deployPreview(
      {
        id: project.id,
        name: project.name,
        vercelProjectId: project.vercelProjectId,
        renderServiceId: project.renderServiceId,
        backendMode: project.backendMode || "NONE"
      },
      branch,
      spec
    )

    // Persist deployment records in DB if model available
    if ((db as any).deployment) {
      await (db as any).deployment.create({
        data: {
          projectId: project.id,
          provider: "VERCEL",
          environment: "PREVIEW",
          providerDeploymentId: deployResult.frontend.id,
          url: deployResult.frontend.url || null,
          status: deployResult.frontend.status,
          errorMessage: deployResult.frontend.error || null
        }
      })
    }

    await db.project.update({
      where: { id: project.id },
      data: {
        vercelPreviewUrl: deployResult.frontend.url || project.vercelPreviewUrl,
        renderUrl: deployResult.backend.url || project.renderUrl,
        lifecycle: "TESTING"
      } as any
    })

    return NextResponse.json({
      success: true,
      frontend: deployResult.frontend,
      backend: deployResult.backend,
      qaReport
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
