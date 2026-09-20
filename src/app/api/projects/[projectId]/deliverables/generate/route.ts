import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { getDeliverableConfig } from "@/modules/registry"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"
import { DeliverableType, VersionSource } from "@prisma/client"

const GenerateSchema = z.object({
  type: z.nativeEnum(DeliverableType),
  instructions: z.string().optional(),
  language: z.string().default("en")
})

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "deliverable:generate")

    const body = await req.json()
    const parse = GenerateSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: parse.error.format() }, { status: 400 })
    
    const { type, instructions, language } = parse.data
    const config = getDeliverableConfig(type)
    
    if (!config) {
      return NextResponse.json({ error: "Module not registered" }, { status: 400 })
    }

    // Build context
    const context = await buildProjectContext(params.projectId)
    const userPrompt = config.buildUserPrompt(context, instructions)
    
    // Call AI orchestration (which has Zod schemas)
    const aiResult = await generateStructured({
      task: type,
      system: config.systemPrompt,
      user: userPrompt,
      schema: config.outputSchema,
      language,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    })

    if (!aiResult.ok) {
      return NextResponse.json({ error: aiResult.error.message }, { status: 500 })
    }

    const content = aiResult.data.data

    // Upsert structure
    const updatedDeliverable = await db.$transaction(async (tx) => {
      let deliverable = await tx.deliverable.findFirst({
        where: { projectId: params.projectId, type }
      })

      if (!deliverable) {
        deliverable = await tx.deliverable.create({
          data: {
            projectId: params.projectId,
            type,
            title: config.i18nTitleKey, // temporary until fetched mapped title
            status: "DRAFT"
          }
        })
      }

      const prevVersionCount = await tx.deliverableVersion.count({
        where: { deliverableId: deliverable.id }
      })

      const version = await tx.deliverableVersion.create({
        data: {
          deliverableId: deliverable.id,
          versionNumber: prevVersionCount + 1,
          content: content as unknown as import("@prisma/client").Prisma.InputJsonValue,
          source: VersionSource.AI,
          language,
          createdById: access.user.id,
          note: instructions || "AI Generated"
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
          action: "GENERATE_DELIVERABLE",
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
