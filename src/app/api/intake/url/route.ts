import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { z } from "zod"
import { fetchAndExtractWebsite } from "@/lib/intake/url"
import { canonicalizeUrl, SsrfError, validateExternalUrl } from "@/lib/ssrf"
import { rebuildProjectContext } from "@/lib/ai/context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Schema = z.object({
  projectId: z.string().min(1),
  url: z.string().trim().min(1).max(2_048),
})

function statusForError(error: unknown): number {
  if (error instanceof SsrfError) {
    if (error.code === "INVALID_URL" || error.code === "INVALID_PROTOCOL" || error.code === "INVALID_PORT") return 400
    if (error.code === "DNS_FAILURE") return 422
    return 403
  }
  if (error instanceof Error && error.name === "AuthError") return 401
  if (error instanceof Error && error.name === "AccessError") return 403
  if (error instanceof Error && /too long|timed out/i.test(error.message)) return 504
  if (error instanceof Error && /larger than|size limit/i.test(error.message)) return 413
  return 503
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  const projectId = params.projectId
  try {
    const access = await requireProjectAccess(projectId, "project:edit")
    const parsed = Schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "A valid website URL is required." }, { status: 400 })

    const requestedUrl = await validateExternalUrl(parsed.data.url)
    const canonicalUrl = canonicalizeUrl(requestedUrl)

    const canonicalChecksum = createHash("sha256").update(canonicalUrl).digest("hex")
    const duplicate = await db.intakeSource.findFirst({ where: { projectId, kind: "URL", OR: [{ label: canonicalUrl }, { checksum: canonicalChecksum }] } })
    if (duplicate) {
      await rebuildProjectContext(projectId).catch((error) => console.warn("Context refresh after duplicate URL failed:", error))
      return NextResponse.json({ ok: true, duplicate: true, data: duplicate, message: "This website is already part of the project context." })
    }

    let extracted
    try {
      extracted = await fetchAndExtractWebsite(canonicalUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to extract content from this website. Try uploading a document instead."
      return NextResponse.json({ error: message }, { status: statusForError(error) })
    }

    const duplicateFinalUrl = await db.intakeSource.findFirst({
      where: { projectId, kind: "URL", OR: [{ label: canonicalUrl }, { url: extracted.responseUrl }] },
    })
    if (duplicateFinalUrl) {
      await rebuildProjectContext(projectId).catch((error) => console.warn("Context refresh after duplicate URL failed:", error))
      return NextResponse.json({ ok: true, duplicate: true, data: duplicateFinalUrl, message: "This website is already part of the project context." })
    }

    const source = await db.intakeSource.create({
      data: {
        projectId,
        kind: "URL",
        label: canonicalUrl,
        url: extracted.responseUrl,
        checksum: canonicalChecksum,
        mimeType: extracted.contentType || "text/html",
        extractedText: extracted.text,
        metadata: extracted.metadata as import("@prisma/client").Prisma.InputJsonValue,
        status: "READY",
      },
    })

    await db.project.update({ where: { id: projectId }, data: { intakeUrl: extracted.responseUrl } })
    const context = await rebuildProjectContext(projectId)

    return NextResponse.json({
      ok: true,
      data: source,
      source: {
        id: source.id,
        kind: source.kind,
        label: source.label,
        url: source.url,
        extractedText: source.extractedText,
        metadata: source.metadata,
      },
      context: { sourceCount: context.sources.length, sourceTypes: context.sourceTypes },
      organizationId: access.project.workspace.organizationId,
    })
  } catch (err: unknown) {
    console.error("POST /api/intake/url failed:", err)
    const message = err instanceof Error ? err.message : "Unable to ingest the website."
    return NextResponse.json({ error: message }, { status: statusForError(err) || 500 })
  }
}
