import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { DeliverableType } from "@prisma/client"
import { getDeliverableConfig } from "@/modules/registry"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string; versionId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId)
    try {
      const version = await db.deliverableVersion.findFirst({
        where: {
          id: params.versionId,
          deliverable: { projectId: params.projectId }
        }
      })
      if (version) return NextResponse.json(version)
    } catch (dbErr) {
      console.warn("DB offline in version GET, returning fallback content:", dbErr)
    }

    // Fallback if version not found in DB or DB offline
    const delivType = params.type.toUpperCase() as DeliverableType
    const config = getDeliverableConfig(delivType)
    const context = await buildProjectContext(params.projectId)
    const userPrompt = config?.buildUserPrompt(context) || context

    const aiResult = config ? await generateStructured({
      task: delivType,
      system: config.systemPrompt,
      user: userPrompt,
      schema: config.outputSchema,
      language: "en",
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    }) : { ok: false, error: { message: "No config" } }

    const content = aiResult.ok && "data" in aiResult ? (aiResult as any).data.data : { title: "Demo Deliverable", description: "Offline Fallback Content" }

    return NextResponse.json({
      id: params.versionId,
      versionNumber: 1,
      content,
      source: "AI",
      createdAt: new Date().toISOString(),
      note: "Generated Fallback Specification"
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
