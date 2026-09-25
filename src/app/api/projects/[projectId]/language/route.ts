/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { DeliverableType, VersionSource } from "@prisma/client"

import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getProjectLanguageConfig, websiteLanguageConfigSchema } from "@/lib/i18n/website-languages"
import { applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { WebsiteSpecSchema, type WebsiteSpecData } from "@/modules/deliverables/website-spec"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId, "project:edit")

    const body = await req.json().catch(() => ({}))
    const currentConfig = getProjectLanguageConfig(project)
    const requestedPrimary = body.primaryLanguage || body.language || currentConfig.primaryLanguage
    const languageConfig = websiteLanguageConfigSchema.safeParse({
      primaryLanguage: requestedPrimary,
      supportedLanguages: body.supportedLanguages || Array.from(new Set([requestedPrimary, ...currentConfig.supportedLanguages])),
    })

    if (!languageConfig.success) {
      return NextResponse.json({ error: "Invalid language configuration", details: languageConfig.error.flatten() }, { status: 400 })
    }

    const config = languageConfig.data
    const dbDelegate = db as unknown as {
      deliverable?: { findFirst: (args: unknown) => Promise<any> }
      $transaction?: (callback: (tx: any) => Promise<any>) => Promise<any>
    }
    const websiteDeliverable = typeof dbDelegate.deliverable?.findFirst === "function"
      ? await dbDelegate.deliverable.findFirst({
        where: { projectId: params.projectId, type: DeliverableType.WEBSITE_SPEC },
        include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
      })
      : null
    const currentSpec = websiteDeliverable?.versions?.[0]?.content as unknown as WebsiteSpecData | undefined
    let nextSpec: WebsiteSpecData | undefined
    if (currentSpec) {
      nextSpec = applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(currentSpec), config)
      const parsed = WebsiteSpecSchema.safeParse(nextSpec)
      if (!parsed.success) {
        return NextResponse.json({ error: "The existing website specification cannot use this language configuration", details: parsed.error.flatten() }, { status: 409 })
      }
      nextSpec = parsed.data as WebsiteSpecData
    }

    const persist = async (tx: any) => {
      let versionId: string | undefined
      if (nextSpec && websiteDeliverable && typeof tx.deliverableVersion?.create === "function") {
        const version = await tx.deliverableVersion.create({
          data: {
            deliverableId: websiteDeliverable.id,
            versionNumber: (await tx.deliverableVersion.count({ where: { deliverableId: websiteDeliverable.id } })) + 1,
            content: nextSpec as object,
            source: VersionSource.USER_EDIT,
            language: config.primaryLanguage,
            createdById: user.id,
            note: `Updated website language configuration to ${config.supportedLanguages.join(", ")}`,
          },
        })
        await tx.deliverable.update({ where: { id: websiteDeliverable.id }, data: { currentVersionId: version.id, status: "APPROVED" } })
        versionId = version.id
      }

      const updatedProject = await tx.project.update({
        where: { id: params.projectId },
        data: {
          language: config.primaryLanguage,
          primaryLanguage: config.primaryLanguage,
          supportedLanguages: config.supportedLanguages,
        },
      })

      if (typeof tx.activityLog?.create === "function") {
        await tx.activityLog.create({
          data: {
            organizationId: project.workspace.organizationId,
            projectId: params.projectId,
            actorId: user.id,
            action: "language_updated",
            entity: "Project",
            entityId: params.projectId,
            metadata: {
              previousLanguage: project.language || "en",
              newLanguage: config.primaryLanguage,
              supportedLanguages: config.supportedLanguages,
            },
          },
        }).catch(() => null)
      }

      return { updatedProject, versionId }
    }

    // The transaction path is used in production. The fallback keeps the
    // endpoint compatible with lightweight database doubles used by older
    // consumers and tests.
    const result = typeof dbDelegate.$transaction === "function"
      ? await dbDelegate.$transaction(persist)
      : await persist(db)

    return NextResponse.json({
      ok: true,
      project: result.updatedProject,
      versionId: result.versionId,
      message: `Project language updated to ${config.primaryLanguage.toUpperCase()}`,
    })
  } catch (error) {
    if (error instanceof Error && (error.name === "AccessError" || error.name === "AuthError")) {
      return NextResponse.json({ error: error.message }, { status: error.name === "AuthError" ? 401 : 403 })
    }
    console.error("Language update error:", error)
    return NextResponse.json({ error: "Failed to update project language" }, { status: 500 })
  }
}
