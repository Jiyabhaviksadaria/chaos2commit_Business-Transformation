/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { DeploymentManager } from "@/lib/deployment/deployment-provider"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { sendDeploymentFailureEmail } from "@/lib/mail/templates/deployment-failure"
import { sendDeploymentSuccessEmail } from "@/lib/mail/templates/deployment-success"

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const project: any = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: { select: { organizationId: true } } }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.lifecycle !== "READY_TO_DEPLOY") {
      return NextResponse.json(
        {
          error: "Production deployment requires prior explicit User Approval. Call /api/projects/[projectId]/approve first."
        },
        { status: 400 }
      )
    }

    const templateId = project.blueprintData?.templateId || "clinic"
    const spec = project.blueprintData?.spec || buildWebsiteSpecFromTemplate(templateId)

    const deployManager = new DeploymentManager()
    const branch = "main"

    const deployResult = await deployManager.deployProduction(
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

    if ((db as any).deployment) {
      await (db as any).deployment.create({
        data: {
          projectId: project.id,
          provider: "VERCEL",
          environment: "PRODUCTION",
          providerDeploymentId: deployResult.frontend.id,
          url: deployResult.frontend.url || null,
          status: deployResult.frontend.status,
          errorMessage: deployResult.frontend.error || null
        }
      })
    }

    const isSuccess = deployResult.frontend.status === "READY" || deployResult.frontend.status === "NOT_CONFIGURED"

    await db.project.update({
      where: { id: project.id },
      data: {
        vercelProductionUrl: deployResult.frontend.url || project.vercelProductionUrl,
        renderUrl: deployResult.backend.url || project.renderUrl,
        lifecycle: isSuccess ? "LIVE" : "FAILED"
      } as any
    })

    // Deployment completion must not wait for SMTP. The hook is intentionally
    // detached and failures are logged without changing the deployment result.
    const membershipDelegate = (db as any).membership
    if (project.workspace?.organizationId && membershipDelegate?.findFirst) {
      void membershipDelegate.findFirst({
        where: { organizationId: project.workspace.organizationId, role: "OWNER" },
        include: { user: { select: { name: true, email: true } } },
      }).then(async (membership: { user?: { name?: string | null; email?: string | null } | null } | null) => {
        const recipient = membership?.user
        if (!recipient?.email) return
        if (isSuccess && deployResult.frontend.url) {
          await sendDeploymentSuccessEmail(recipient.name || "there", recipient.email, project.name, deployResult.frontend.url)
        } else if (!isSuccess) {
          await sendDeploymentFailureEmail(recipient.name || "there", recipient.email, project.name, project.id)
        }
      }).catch((error: unknown) => console.error("Deployment email hook failed", { projectId: project.id, error: error instanceof Error ? error.message : "unknown error" }))
    }

    return NextResponse.json({
      success: isSuccess,
      frontend: deployResult.frontend,
      backend: deployResult.backend,
      lifecycle: isSuccess ? "LIVE" : "FAILED"
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
