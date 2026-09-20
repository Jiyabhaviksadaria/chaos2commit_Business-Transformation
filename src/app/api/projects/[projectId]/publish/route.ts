import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const slug = access.project.siteSlug ?? `site-${params.projectId.slice(0, 8)}-${Date.now()}`
    const updated = await db.project.update({
      where: { id: params.projectId },
      data: { sitePublished: true, siteSlug: slug }
    })
    return NextResponse.json({ ok: true, siteSlug: updated.siteSlug })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
