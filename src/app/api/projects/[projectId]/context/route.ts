import { requireProjectAccess } from "@/lib/access"
import { getProjectContextSnapshot } from "@/lib/ai/context"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId)
    const context = await getProjectContextSnapshot(params.projectId)
    const metadata = context.metadata
    return NextResponse.json({
      context,
      companyContext: metadata.companyContext || null,
      discoveryState: metadata.discovery || null,
      readiness: metadata.readiness || null,
      intelligence: metadata.intelligence || null,
    })
  } catch (error) {
    console.error("GET project context failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to load project context." }, { status })
  }
}
