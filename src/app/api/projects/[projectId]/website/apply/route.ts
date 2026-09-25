/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { DeliverableType, VersionSource } from "@prisma/client"
import { applyWebsiteDelta, type WebsiteDelta } from "@/lib/ai/website-customization-engine"
import { WebsiteSpecSchema, type WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { getProjectLanguageConfig } from "@/lib/i18n/website-languages"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project: projAccess } = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()
    const { delta, updatedSpec, summary } = body

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

    let deliverable = project.deliverables[0]
    let baseSpec: WebsiteSpecData

    if (deliverable?.versions[0]?.content) {
      baseSpec = deliverable.versions[0].content as unknown as WebsiteSpecData
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

    let targetSpec: WebsiteSpecData
    let changeSummary = summary || "Website spec updated"

    if (delta) {
      targetSpec = applyWebsiteDelta(baseSpec, delta as WebsiteDelta)
      changeSummary = delta.summary || summary || "Applied AI website customization"
    } else if (updatedSpec) {
      targetSpec = updatedSpec
    } else {
      return NextResponse.json({ error: "Either delta or updatedSpec is required" }, { status: 400 })
    }

    targetSpec = applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(targetSpec), getProjectLanguageConfig(project))

    // Validate schema
    const parseResult = WebsiteSpecSchema.safeParse(targetSpec)
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid website specification format", details: parseResult.error.format() }, { status: 400 })
    }

    // Ensure deliverable exists
    if (!deliverable) {
      deliverable = await db.deliverable.create({
        data: {
          projectId: params.projectId,
          type: DeliverableType.WEBSITE_SPEC,
          title: "Website Specification",
          status: "APPROVED"
        },
        include: { versions: true }
      })
    }

    const nextVersionNumber = (deliverable.versions?.[0]?.versionNumber || 0) + 1

    const newVersion = await db.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: nextVersionNumber,
        content: targetSpec as any,
        source: delta ? VersionSource.AI : VersionSource.USER_EDIT,
        language: targetSpec.language || "en",
        createdById: user.id,
        note: changeSummary
      }
    })

    await db.deliverable.update({
      where: { id: deliverable.id },
      data: {
        currentVersionId: newVersion.id,
        status: "APPROVED"
      }
    })
    if (typeof (db.project as any).update === "function") {
      await db.project.update({
        where: { id: params.projectId },
        data: {
          language: targetSpec.primaryLanguage || targetSpec.language || "en",
          primaryLanguage: targetSpec.primaryLanguage || targetSpec.language || "en",
          supportedLanguages: targetSpec.supportedLanguages || [targetSpec.primaryLanguage || targetSpec.language || "en"],
        }
      })
    }

    await db.activityLog.create({
      data: {
        organizationId: project.workspace?.organizationId || projAccess.workspace?.organizationId || "org_default",
        projectId: params.projectId,
        actorId: user.id,
        action: delta ? "website_customization_applied" : "website_version_created",
        entity: "WEBSITE_SPEC",
        entityId: deliverable.id,
        metadata: { versionNumber: nextVersionNumber, summary: changeSummary }
      }
    })

    return NextResponse.json({
      ok: true,
      version: newVersion,
      spec: targetSpec
    })
  } catch (error: any) {
    if (error.name === "AccessError" || error.name === "AuthError" || error.message?.includes("Access Denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/projects/[projectId]/website/apply] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to apply website customization" }, { status: 500 })
  }
}
