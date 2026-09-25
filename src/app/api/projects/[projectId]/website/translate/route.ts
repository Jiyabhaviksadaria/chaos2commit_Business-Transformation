/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { z } from "zod"
import { DeliverableType, VersionSource } from "@prisma/client"

import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateMultilingualWebsiteTranslation } from "@/lib/ai/groq-qwen"
import { isAppLocale, normalizeLocale } from "@/i18n/locales"
import { getProjectLanguageConfig, normalizeWebsiteLanguageConfig } from "@/lib/i18n/website-languages"
import { WebsiteSpecSchema, type WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { applyWebsiteLanguageConfig, resolveWebsiteLocale, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"

const TranslationSchema = z.object({
  sourceLanguage: z.string().refine(isAppLocale, "Unsupported source language"),
  targetLanguage: z.string().refine(isAppLocale, "Unsupported target language"),
  // The editor sends its current in-memory snapshot so translation never uses
  // stale persisted copy text after an unsaved primary-language edit.
  spec: z.unknown().optional(),
})

function sameSectionStructure(source: WebsiteSpecData, translated: NonNullable<WebsiteSpecData["localizedContent"]>[string]): boolean {
  const sourceSections = source.sections || []
  const translatedSections = translated.sections || []
  if (sourceSections.length !== translatedSections.length) return false
  return sourceSections.every((section, index) => {
    const candidate = translatedSections[index]
    if (!candidate || section.type !== candidate.type) return false
    if ((section.id || section.type) !== (candidate.id || candidate.type)) return false
    return (section.order ?? index + 1) === (candidate.order ?? index + 1) && (section.visible ?? true) === (candidate.visible ?? true)
  })
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const rawBody = await request.json().catch(() => ({}))
    const parsed = TranslationSchema.safeParse(rawBody)
    if (!parsed.success || parsed.data.sourceLanguage === parsed.data.targetLanguage) {
      return NextResponse.json({ error: "Choose two different supported languages." }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: params.projectId },
      include: {
        deliverables: {
          where: { type: DeliverableType.WEBSITE_SPEC },
          include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
        },
      },
    })
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 })

    const latest = project.deliverables[0]?.versions[0]?.content as unknown as WebsiteSpecData | undefined
    const blueprintSpec = (project.blueprintData as { websiteSpec?: WebsiteSpecData } | null)?.websiteSpec
    const storedSpec = latest || blueprintSpec
    if (!storedSpec && parsed.data.spec === undefined) {
      return NextResponse.json({ error: "Generate a website specification before translating it." }, { status: 409 })
    }

    let sourceSpec = parsed.data.spec
    if (sourceSpec !== undefined) {
      const submitted = WebsiteSpecSchema.safeParse(sourceSpec)
      if (!submitted.success) return NextResponse.json({ error: "The submitted website snapshot is invalid." }, { status: 400 })
      sourceSpec = submitted.data as WebsiteSpecData
    } else {
      sourceSpec = storedSpec as WebsiteSpecData
    }

    const currentConfig = getProjectLanguageConfig(project)
    const configuredSource = applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(sourceSpec as WebsiteSpecData), currentConfig)
    const resolvedSource = resolveWebsiteLocale(configuredSource, parsed.data.sourceLanguage, currentConfig.primaryLanguage)
    // A pending/missing source is not allowed to masquerade as a translation.
    if (normalizeLocale(resolvedSource.language) !== normalizeLocale(parsed.data.sourceLanguage)) {
      return NextResponse.json({ error: "The source language does not have ready content to translate." }, { status: 409 })
    }

    const result = await generateMultilingualWebsiteTranslation({
      sourceSpec: resolvedSource,
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })
    if (!result.ok) {
      console.error("Website translation generation failed", { projectId: params.projectId, targetLanguage: parsed.data.targetLanguage, error: result.error })
      const providerError = /^(OPENROUTER|GROQ)_/.test(result.error.code)
      const status = result.error.code === "RATE_LIMITED" ? 429 : providerError ? 503 : 502
      return NextResponse.json({ error: result.error.message }, { status })
    }
    const translated = result.data.data
    if (!translated.siteName || !translated.nav?.length || !translated.sections?.length || !translated.seo) {
      return NextResponse.json({ error: "The translation is missing required website content, sections, or SEO content." }, { status: 502 })
    }
    if (!sameSectionStructure(resolvedSource, translated)) {
      return NextResponse.json({ error: "The translation changed the website section structure. Regenerate it without changing IDs, order, or visibility." }, { status: 502 })
    }

    const nextConfig = normalizeWebsiteLanguageConfig({
      primaryLanguage: currentConfig.primaryLanguage,
      supportedLanguages: [...currentConfig.supportedLanguages, parsed.data.targetLanguage],
    })
    const nextSpec = applyWebsiteLanguageConfig(
      syncPrimaryWebsiteContent({
        ...(sourceSpec as WebsiteSpecData),
        localizedContent: {
          ...((sourceSpec as WebsiteSpecData).localizedContent || {}),
          [parsed.data.targetLanguage]: translated,
        },
        translationStatus: {
          ...((sourceSpec as WebsiteSpecData).translationStatus || {}),
          [parsed.data.targetLanguage]: "ready",
        },
      }),
      nextConfig,
    )
    const validated = WebsiteSpecSchema.safeParse(nextSpec)
    if (!validated.success) return NextResponse.json({ error: "The translated website content did not match the website schema." }, { status: 502 })

    const persistedSpec = validated.data as WebsiteSpecData
    const persist = async (tx: any) => {
      const existing = project.deliverables[0] || await tx.deliverable.create({
        data: { projectId: project.id, type: DeliverableType.WEBSITE_SPEC, title: "Website Specification", status: "DRAFT" },
      })
      const version = await tx.deliverableVersion.create({
        data: {
          deliverableId: existing.id,
          versionNumber: (await tx.deliverableVersion.count({ where: { deliverableId: existing.id } })) + 1,
          content: persistedSpec as object,
          source: VersionSource.AI,
          language: parsed.data.targetLanguage,
          createdById: access.user.id,
          note: `Generated ${parsed.data.targetLanguage} website content`,
        },
      })
      await tx.deliverable.update({ where: { id: existing.id }, data: { currentVersionId: version.id, status: "APPROVED" } })
      await tx.project.update({ where: { id: project.id }, data: { language: nextConfig.primaryLanguage, primaryLanguage: nextConfig.primaryLanguage, supportedLanguages: nextConfig.supportedLanguages } })
      return version
    }

    const version = typeof (db as any).$transaction === "function"
      ? await (db as any).$transaction(persist)
      : await persist(db)
    return NextResponse.json({ ok: true, spec: persistedSpec, versionId: version.id, locale: parsed.data.targetLanguage })
  } catch (error) {
    console.error("Website translation request failed", { projectId: params.projectId, error })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Translation failed." }, { status: 500 })
  }
}
