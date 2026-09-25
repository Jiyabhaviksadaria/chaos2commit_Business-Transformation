import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { DeliverableType } from "@prisma/client"
import { NextResponse } from "next/server"
import { getProjectLanguageConfig } from "@/lib/i18n/website-languages"
import { applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId)
    const websiteDeliverable = await db.deliverable.findFirst({
      where: { projectId: params.projectId, type: DeliverableType.WEBSITE_SPEC },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    })
    const rawSpec = (websiteDeliverable?.versions[0]?.content || (access.project.blueprintData as { websiteSpec?: unknown } | null)?.websiteSpec) as WebsiteSpecData | null
    const spec = rawSpec ? applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(rawSpec), getProjectLanguageConfig(access.project)) : null
    return NextResponse.json({
      ...access.project,
      deliverables: websiteDeliverable ? [websiteDeliverable] : [],
      spec,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
