import { db } from "@/lib/db"
/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation"
import { SiteRenderer } from "@/components/website/site-renderer"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { DeliverableType } from "@prisma/client"
import type { Metadata } from "next"
import { specStore } from "@/lib/website/spec-store"

export const dynamic = "force-dynamic"

// Helper function to build fallback website spec from blueprint if deliverable is not explicitly created
function buildFallbackWebsiteSpec(blueprint: any, projectName: string, businessGoal?: string): WebsiteSpecData {
  const siteName = blueprint?.productOverview ? blueprint.productOverview.split(" ")[0] + " Portal" : projectName
  const modules = blueprint?.modules || []

  return {
    siteName: siteName || projectName || "Digital Platform",
    language: "en",
    dir: "ltr",
    theme: {
      primary: "#3B82F6",
      style: "MODERN"
    },
    nav: ["Home", "About", "Services", "Contact"],
    sections: [
      {
        id: "hero",
        type: "hero",
        order: 1,
        visible: true,
        headline: blueprint?.productOverview || `Welcome to ${projectName}`,
        subheadline: blueprint?.businessObjective || businessGoal || "Digital application platform.",
        ctaLabel: "Explore Workspace"
      },
      {
        id: "about",
        type: "about",
        order: 2,
        visible: true,
        title: "About Us",
        body: blueprint?.businessObjective || businessGoal || "Providing digital transformation solutions."
      },
      {
        id: "services",
        type: "services",
        order: 3,
        visible: true,
        title: "Services",
        items: modules.length > 0 ? modules.map((m: any) => ({
          title: m.name || m.key,
          description: m.description || "Module service"
        })) : [
          { title: "Core Services", description: "Automated workflow management." }
        ]
      },
      {
        id: "contact",
        type: "contact",
        order: 4,
        visible: true,
        title: "Contact Us",
        body: "Get in touch for system access or support."
      },
      {
        id: "footer",
        type: "footer",
        order: 5,
        visible: true,
        text: `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`
      }
    ],
    seo: {
      title: siteName,
      description: (blueprint?.businessObjective || businessGoal || projectName).slice(0, 160)
    }
  }
}

type PublishedSite = {
  name: string
  businessGoal: string
  spec: WebsiteSpecData | null
}

async function getPublishedSite(siteSlug: string): Promise<PublishedSite | null> {
  const cached = specStore.get(siteSlug)
  if (cached?.spec) {
    return {
      name: cached.name,
      businessGoal: "",
      spec: cached.spec as WebsiteSpecData,
    }
  }

  try {
    const project = await db.project.findUnique({
      where: { siteSlug },
      include: {
        deliverables: {
          where: { type: DeliverableType.WEBSITE_SPEC },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        },
      },
    })

    if (!project?.sitePublished) return null

    const deliverableSpec = project.deliverables[0]?.versions[0]?.content as unknown as WebsiteSpecData | undefined
    const blueprint = project.blueprintData as any
    const spec = deliverableSpec || blueprint?.websiteSpec || null

    return {
      name: project.name,
      businessGoal: project.businessGoal,
      spec,
    }
  } catch (error) {
    console.error(`Unable to load published site "${siteSlug}":`, error)
    return null
  }
}

export async function generateMetadata({ params }: { params: { siteSlug: string } }): Promise<Metadata> {
  const site = await getPublishedSite(params.siteSlug)
  if (!site) return {}

  const spec = site.spec
  if (spec?.seo) {
    return {
      title: spec.seo.title || site.name,
      description: spec.seo.description || site.businessGoal.slice(0, 160),
      keywords: spec.seo.keywords,
      openGraph: {
        title: spec.seo.ogTitle || spec.seo.title || site.name,
        description: spec.seo.ogDescription || spec.seo.description || site.businessGoal.slice(0, 160),
      },
    }
  }

  return {
    title: site.name,
    description: site.businessGoal.slice(0, 160),
  }
}

export default async function PublicSitePage({ params }: { params: { siteSlug: string } }) {
  const site = await getPublishedSite(params.siteSlug)
  if (!site) notFound()

  let spec = site.spec
  if (!spec && site.businessGoal) {
    spec = buildFallbackWebsiteSpec(null, site.name, site.businessGoal)
  }

  if (!spec) notFound()

  return <SiteRenderer spec={spec} preview={false} />
}
