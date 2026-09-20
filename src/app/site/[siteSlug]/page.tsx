import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { SiteRenderer } from "@/components/website/site-renderer"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { DeliverableType } from "@prisma/client"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: { siteSlug: string } }): Promise<Metadata> {
  const project = await db.project.findUnique({ where: { siteSlug: params.siteSlug } })
  if (!project?.sitePublished) return {}
  return { title: project.name, description: project.businessGoal.slice(0, 160) }
}

export default async function PublicSitePage({ params }: { params: { siteSlug: string } }) {
  const project = await db.project.findUnique({
    where: { siteSlug: params.siteSlug },
    include: {
      deliverables: {
        where: { type: DeliverableType.WEBSITE_SPEC },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
      }
    }
  })

  if (!project?.sitePublished) notFound()

  const deliverable = project.deliverables[0]
  const spec = deliverable?.versions[0]?.content as unknown as WebsiteSpecData
  if (!spec) notFound()

  return <SiteRenderer spec={spec} />
}
