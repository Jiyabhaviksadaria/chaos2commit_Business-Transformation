import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateBlueprintDelta } from "@/lib/ai/customization-engine"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ ok: false, error: "Customization prompt cannot be empty" }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: params.projectId }
    })

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 })
    }

    if (!project.blueprintData) {
      return NextResponse.json(
        { ok: false, error: "Project must have an approved Master Blueprint before applying AI customizations" },
        { status: 400 }
      )
    }

    // Generate Structured Blueprint Delta with AI
    const deltaRes = await generateBlueprintDelta({
      prompt: prompt.trim(),
      blueprint: project.blueprintData,
      language: project.language || "en",
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    })

    if (!deltaRes.ok) {
      return NextResponse.json({ ok: false, error: deltaRes.error }, { status: 500 })
    }

    const delta = deltaRes.data

    // Create a BlueprintChange proposal record
    const changeRecord = await db.blueprintChange.create({
      data: {
        projectId: params.projectId,
        prompt: prompt.trim(),
        summary: delta.summary,
        delta: JSON.parse(JSON.stringify(delta)),
        impact: JSON.parse(
          JSON.stringify({
            affectedModules: delta.affectedModules,
            affectedDeliverables: delta.affectedDeliverables,
            affectedRuntimeComponents: delta.affectedRuntimeComponents
          })
        ),
        riskLevel: delta.riskLevel,
        status: "PENDING",
        createdById: access.user.id
      }
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "blueprint_change_proposed",
        entity: "BlueprintChange",
        entityId: changeRecord.id,
        metadata: {
          summary: delta.summary,
          riskLevel: delta.riskLevel,
          affectedModules: delta.affectedModules
        }
      }
    })

    return NextResponse.json({
      ok: true,
      change: changeRecord
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error generating customization proposal" },
      { status: 500 }
    )
  }
}
