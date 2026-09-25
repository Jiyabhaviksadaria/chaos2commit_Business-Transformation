import { NextResponse } from "next/server"
import { resolveUserWorkspace } from "@/lib/team-chat/access"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedWorkspaceId = searchParams.get("workspaceId")

    const { workspace, user, orgRole } = await resolveUserWorkspace(requestedWorkspaceId)

    // Get all members belonging to this workspace's organization
    const orgMemberships = await db.membership.findMany({
      where: { organizationId: workspace.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            companyRole: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const members = orgMemberships.map((m) => ({
      ...m.user,
      orgRole: m.role,
    }))

    // Query projects belonging to this workspace
    const projects = await db.project.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        industry: true,
        businessGoal: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        organizationId: workspace.organizationId,
      },
      currentUser: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyRole: user.companyRole,
        department: (user as { department?: string }).department || null,
        orgRole,
      },
      members,
      projects,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/team-chat/workspace] Error:", error)
    return NextResponse.json({ error: "Unable to load workspace." }, { status: 500 })
  }
}
