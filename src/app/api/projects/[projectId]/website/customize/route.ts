/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { DeliverableType } from "@prisma/client"
import { generateWebsiteDelta } from "@/lib/ai/website-customization-engine"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project: projAccess } = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return NextResponse.json({ error: "Customization prompt is required" }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: true,
        deliverables: {
          where: { type: DeliverableType.WEBSITE_SPEC },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    let baseSpec: WebsiteSpecData
    const websiteDeliverable = project.deliverables[0]
    const latestVersion = websiteDeliverable?.versions[0]

    if (latestVersion?.content) {
      baseSpec = latestVersion.content as unknown as WebsiteSpecData
    } else {
      const bp = ((project as any).blueprintData as any) || {}
      baseSpec = {
        siteName: project.name || "Business Platform",
        language: project.language || "en",
        theme: { primary: "#3B82F6", style: "MODERN" },
        nav: ["Home", "About", "Services", "Contact"],
        sections: [
          { id: "hero", type: "hero", order: 1, visible: true, headline: project.name, subheadline: project.businessGoal || "Digital Application Platform", ctaLabel: "Explore" },
          { id: "about", type: "about", order: 2, visible: true, title: "About Us", body: "We provide modern digital capabilities." },
          { id: "services", type: "services", order: 3, visible: true, title: "Services", items: (bp.modules || []).map((m: any) => ({ title: m.name || m.key, description: m.description || "Module service" })) },
          { id: "contact", type: "contact", order: 4, visible: true, title: "Contact Us", body: "Get in touch for details." },
          { id: "footer", type: "footer", order: 5, visible: true, text: `© 2026 ${project.name}. All rights reserved.` }
        ],
        seo: { title: project.name, description: (project.businessGoal || "").slice(0, 160) }
      }
    }

    const result = await generateWebsiteDelta(baseSpec, prompt, body.modelId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    await db.activityLog.create({
      data: {
        organizationId: project.workspace?.organizationId || projAccess.workspace?.organizationId || "org_default",
        projectId: params.projectId,
        actorId: user.id,
        action: "website_customization_requested",
        entity: "WEBSITE_SPEC",
        entityId: project.id,
        metadata: { prompt, summary: result.data.summary }
      }
    })

    return NextResponse.json({
      ok: true,
      delta: result.data,
      baseSpec
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/website/customize] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate website customization proposal" }, { status: 500 })
  }
}
