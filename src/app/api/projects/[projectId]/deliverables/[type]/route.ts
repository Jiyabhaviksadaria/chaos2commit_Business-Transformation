import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { generateMultilingualWebsite } from "@/lib/ai/groq-qwen"
import { buildProjectContext } from "@/lib/ai/context"
import { DeliverableType, VersionSource } from "@prisma/client"
import { z } from "zod"

function parseType(value: string): DeliverableType | null {
  const parsed = z.nativeEnum(DeliverableType).safeParse(value.toUpperCase())
  return parsed.success ? parsed.data : null
}

export async function GET(_req: NextRequest, { params }: { params: { projectId: string; type: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId)
    const type = parseType(params.type)
    if (!type) return NextResponse.json({ error: "Unknown deliverable type." }, { status: 400 })

    let deliverable: Awaited<ReturnType<typeof db.deliverable.findFirst>> = null
    try {
      deliverable = await db.deliverable.findFirst({
        where: { projectId: params.projectId, type },
        include: { versions: { orderBy: { versionNumber: "desc" }, select: { id: true, versionNumber: true, source: true, createdAt: true, createdById: true, note: true, language: true } } },
      })
    } catch (error) {
      if (type !== DeliverableType.WEBSITE_SPEC) throw error
      console.warn("Website Builder deliverable lookup failed; using its compatibility fallback:", error)
    }
    if (deliverable) return NextResponse.json(deliverable)

    // Preserve the existing Website Builder fallback only for its dedicated
    // website specification. Transformation stages fail closed when no persisted
    // deliverable exists.
    if (type !== DeliverableType.WEBSITE_SPEC) return NextResponse.json(null)
    const config = getDeliverableConfig(type)
    if (!config) return NextResponse.json(null)
    const context = await buildProjectContext(params.projectId)
    const primaryLanguage = access.project.primaryLanguage || access.project.language || "en"
    const supportedLanguages = Array.from(new Set([primaryLanguage, ...(access.project.supportedLanguages || [])]))
    const websiteResult = await generateMultilingualWebsite({
      context,
      primaryLanguage,
      supportedLanguages,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })
    if (!websiteResult.ok) {
      return NextResponse.json({ error: websiteResult.error.message }, { status: websiteResult.error.code === "RATE_LIMITED" ? 429 : 503 })
    }
    const content = websiteResult.data.data
    return NextResponse.json({
      id: `deliv-${type}-fallback`,
      projectId: params.projectId,
      type,
      title: config.i18nTitleKey,
      status: "DRAFT",
      versions: [{ id: `ver-${type}-1`, versionNumber: 1, source: "AI", createdAt: new Date().toISOString(), createdById: access.user.id, note: "Default Generated Specification", content }],
    })
  } catch (error) {
    console.error("GET deliverable failed:", error)
    return NextResponse.json({ error: "Unable to load the deliverable." }, { status: 503 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { projectId: string; type: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const type = parseType(params.type)
    if (!type) return NextResponse.json({ error: "Unknown deliverable type." }, { status: 400 })
    const config = getDeliverableConfig(type)
    if (!config) return NextResponse.json({ error: "This transformation module is not registered." }, { status: 400 })
    const body = await req.json().catch(() => ({}))
    const parsed = config.outputSchema.safeParse(body.content)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    try {
      const updated = await db.$transaction(async (tx) => {
        let deliverable = await tx.deliverable.findFirst({ where: { projectId: params.projectId, type } })
        if (!deliverable) deliverable = await tx.deliverable.create({ data: { projectId: params.projectId, type, title: config.i18nTitleKey, status: "DRAFT" } })
        const version = await tx.deliverableVersion.create({ data: { deliverableId: deliverable.id, versionNumber: (await tx.deliverableVersion.count({ where: { deliverableId: deliverable.id } })) + 1, content: parsed.data as unknown as Prisma.InputJsonValue, source: VersionSource.USER_EDIT, language: "en", createdById: access.user.id, note: body.note || "Manual user edit" } })
        deliverable = await tx.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
        return { deliverable, version }
      })
      return NextResponse.json(updated)
    } catch (error) {
      if (type !== DeliverableType.WEBSITE_SPEC) throw error
      // Website Builder's existing editor tolerated a temporary persistence
      // failure with an in-memory response. Keep that protected behavior.
      console.warn("Website Builder deliverable edit persistence failed; returning compatibility response:", error)
      return NextResponse.json({
        deliverable: { id: `deliv-${type}-edited`, projectId: params.projectId, type, title: config.i18nTitleKey, status: "DRAFT" },
        version: { id: `v-edited-${Date.now()}`, versionNumber: 2, content: parsed.data, source: "USER_EDIT", note: body.note || "Manual user edit" },
      })
    }
  } catch (error) {
    console.error("PATCH deliverable failed:", error)
    return NextResponse.json({ error: "Unable to save the deliverable." }, { status: 503 })
  }
}
