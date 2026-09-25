import { DeliverableType } from "@prisma/client"

import { db } from "@/lib/db"
import { getProjectLanguageConfig } from "@/lib/i18n/website-languages"
import { applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export async function getLatestProjectWebsiteSpec(projectId: string): Promise<WebsiteSpecData | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      language: true,
      primaryLanguage: true,
      supportedLanguages: true,
      blueprintData: true,
    },
  })
  if (!project) return null

  const deliverable = await db.deliverable.findFirst({
    where: { projectId, type: DeliverableType.WEBSITE_SPEC },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  })
  const versionSpec = deliverable?.versions[0]?.content as unknown as WebsiteSpecData | undefined
  const blueprintSpec = (project.blueprintData as { websiteSpec?: WebsiteSpecData } | null)?.websiteSpec
  const spec = versionSpec || blueprintSpec
  return spec ? applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(spec), getProjectLanguageConfig(project)) : null
}
