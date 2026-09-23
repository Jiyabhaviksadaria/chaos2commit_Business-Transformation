/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { specStore } from "@/lib/website/spec-store"

function getRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")
  const host = forwardedHost || req.headers.get("host")

  if (host) {
    const forwardedProto = req.headers.get("x-forwarded-proto")
    const protocol = forwardedProto?.split(",")[0].trim() || (host.startsWith("localhost") ? "http" : "https")
    return `${protocol}://${host}`
  }

  return new URL(req.url).origin
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)
    const body = await req.json().catch(() => ({}))
    const spec = body?.spec

    if (!spec) {
      return NextResponse.json({ ok: false, error: "No spec provided" }, { status: 400 })
    }

    // Generate slug from project name + projectId suffix
    let projectName = spec?.siteName || "my-site"
    try {
      const project = await db.project.findUnique({ where: { id: params.projectId } })
      if (project?.name) projectName = project.name
    } catch {
      // DB offline — use spec siteName
    }

    const cleanName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 28)
    const slug = `${cleanName}-${params.projectId.slice(-6)}`

    // Always store in memory first (this is guaranteed to work)
    specStore.set(slug, { spec, name: projectName, savedAt: new Date() })

    // Try to persist to DB — store spec in blueprintData JSON field as { websiteSpec: ... }
    try {
      const existing = await db.project.findUnique({ where: { id: params.projectId } })
      const existingBlueprint = (existing?.blueprintData as any) || {}

      await db.project.update({
        where: { id: params.projectId },
        data: {
          siteSlug: slug,
          sitePublished: true,
          lifecycle: "LIVE",
          blueprintData: {
            ...existingBlueprint,
            websiteSpec: spec,
            publishedAt: new Date().toISOString()
          }
        }
      })
    } catch (dbErr) {
      console.warn("DB save failed — using in-memory store only:", dbErr)
    }

    const siteUrl = `${getRequestOrigin(req)}/site/${slug}`
    return NextResponse.json({ ok: true, slug, url: siteUrl })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    )
  }
}
