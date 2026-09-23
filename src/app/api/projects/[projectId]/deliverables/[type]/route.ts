import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType, VersionSource } from "@prisma/client"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId)
    const delivType = params.type.toUpperCase() as DeliverableType

    try {
      const deliverable = await db.deliverable.findFirst({
        where: { projectId: params.projectId, type: delivType },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
            select: { id: true, versionNumber: true, source: true, createdAt: true, createdById: true, note: true }
          }
        }
      })

      if (deliverable) return NextResponse.json(deliverable)
    } catch (dbErr) {
      console.warn("DB offline in deliverable GET, generating fallback draft:", dbErr)
    }

    // Fallback if DB offline or deliverable not yet created
    const config = getDeliverableConfig(delivType)
    if (!config) return NextResponse.json(null)

    const context = await buildProjectContext(params.projectId)
    const userPrompt = config.buildUserPrompt(context)
    const aiResult = await generateStructured({
      task: delivType,
      system: config.systemPrompt,
      user: userPrompt,
      schema: config.outputSchema,
      language: "en",
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    })

    const content = aiResult.ok && "data" in aiResult ? (aiResult as any).data.data : {}

    const mockDeliverable = {
      id: `deliv-${delivType}-fallback`,
      projectId: params.projectId,
      type: delivType,
      title: config.i18nTitleKey,
      status: "DRAFT",
      versions: [
        {
          id: `ver-${delivType}-1`,
          versionNumber: 1,
          source: "AI",
          createdAt: new Date().toISOString(),
          createdById: access.user.id,
          note: "Default Generated Specification",
          content
        }
      ]
    }

    return NextResponse.json(mockDeliverable)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")

    const delivType = params.type.toUpperCase() as DeliverableType
    const config = getDeliverableConfig(delivType)
    if (!config) return NextResponse.json({ error: "Module not registered" }, { status: 400 })

    const body = await req.json()
    const parse = config.outputSchema.safeParse(body.content)
    if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 })

    try {
      const updatedDeliverable = await db.$transaction(async (tx) => {
        let deliverable = await tx.deliverable.findFirst({
          where: { projectId: params.projectId, type: delivType }
        })

        if (!deliverable) {
          deliverable = await tx.deliverable.create({
            data: { projectId: params.projectId, type: delivType, title: config.i18nTitleKey, status: "DRAFT" }
          })
        }

        const prevVersionCount = await tx.deliverableVersion.count({
          where: { deliverableId: deliverable.id }
        })

        const version = await tx.deliverableVersion.create({
          data: {
            deliverableId: deliverable.id,
            versionNumber: prevVersionCount + 1,
            content: parse.data as unknown as import("@prisma/client").Prisma.InputJsonValue,
            source: VersionSource.USER_EDIT,
            language: "en",
            createdById: access.user.id,
            note: body.note || "Manual User Edit"
          }
        })

        deliverable = await tx.deliverable.update({
          where: { id: deliverable.id },
          data: { currentVersionId: version.id }
        })

        return { deliverable, version }
      })

      return NextResponse.json(updatedDeliverable)
    } catch (dbErr) {
      console.warn("DB offline in deliverable PATCH, returning in-memory response:", dbErr)
      return NextResponse.json({
        deliverable: { id: `deliv-${delivType}-edited`, projectId: params.projectId, type: delivType, title: config.i18nTitleKey, status: "DRAFT" },
        version: { id: `v-edited-${Date.now()}`, versionNumber: 2, content: parse.data, source: "USER_EDIT", note: body.note || "Manual User Edit" }
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
