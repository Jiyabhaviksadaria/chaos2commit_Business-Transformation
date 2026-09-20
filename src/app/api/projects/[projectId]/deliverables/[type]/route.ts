import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { DeliverableType, VersionSource } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; type: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const delivType = params.type.toUpperCase() as DeliverableType

    const deliverable = await db.deliverable.findFirst({
      where: { projectId: params.projectId, type: delivType },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          select: { id: true, versionNumber: true, source: true, createdAt: true, createdById: true, note: true }
        }
      }
    })

    if (!deliverable) return NextResponse.json(null)
    return NextResponse.json(deliverable)
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
    // Validate edit with the exact same Zod schema!
    const parse = config.outputSchema.safeParse(body.content)
    if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 })

    const updatedDeliverable = await db.$transaction(async (tx) => {
      let deliverable = await tx.deliverable.findFirst({
        where: { projectId: params.projectId, type: delivType }
      })

      if (!deliverable) {
        // Can technically create it if they are doing a manual edit before AI handles it
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
          language: "en", // Simplified for edits; usually inherited or supplied
          createdById: access.user.id,
          note: body.note || "Manual User Edit"
        }
      })

      deliverable = await tx.deliverable.update({
        where: { id: deliverable.id },
        data: { currentVersionId: version.id }
      })

      await tx.activityLog.create({
        data: {
          organizationId: access.project.workspace.organizationId,
          projectId: params.projectId,
          actorId: access.user.id,
          action: "EDIT_DELIVERABLE",
          entity: "DeliverableVersion",
          entityId: version.id
        }
      })

      return { deliverable, version }
    })

    return NextResponse.json(updatedDeliverable)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
