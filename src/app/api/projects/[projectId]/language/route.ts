/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export const runtime = "nodejs"

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId)

    const body = await req.json()
    const { language } = body

    if (!language || typeof language !== "string") {
      return NextResponse.json({ error: "Invalid language code provided" }, { status: 400 })
    }

    const updatedProject = await db.project.update({
      where: { id: params.projectId },
      data: { language: language.toLowerCase() }
    })

    const orgId = (project as any).workspace?.organizationId || "org_default"

    // Log Activity
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "language_updated",
        entity: "Project",
        entityId: params.projectId,
        metadata: {
          previousLanguage: project.language || "en",
          newLanguage: language
        }
      }
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      project: updatedProject,
      message: `Project language updated to ${language.toUpperCase()}`
    })
  } catch (error) {
    console.error("Language update error:", error)
    return NextResponse.json({ error: "Failed to update project language" }, { status: 500 })
  }
}
