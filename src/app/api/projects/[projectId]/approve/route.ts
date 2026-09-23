/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const projectId = params.projectId
    const project = await db.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        lifecycle: "READY_TO_DEPLOY"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Project version approved for Production Deployment.",
      lifecycle: updated.lifecycle
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
