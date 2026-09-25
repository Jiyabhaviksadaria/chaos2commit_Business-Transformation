import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()

    const memberships = await db.membership.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            workspaces: {
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const cookieOrg = req.cookies.get("intelly_active_org")?.value
    let activeOrg = memberships.find((m) => m.organizationId === cookieOrg)

    if (!activeOrg && memberships.length > 0) {
      activeOrg = memberships[0]
    }

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      workspaceId: m.organization.workspaces[0]?.id || null,
      workspaceName: m.organization.workspaces[0]?.name || null,
      isActive: m.organizationId === activeOrg?.organizationId,
    }))

    return NextResponse.json({
      ok: true,
      membershipCount: memberships.length,
      activeOrganizationId: activeOrg?.organizationId || null,
      activeOrganizationName: activeOrg?.organization.name || null,
      activeWorkspaceId: activeOrg?.organization.workspaces[0]?.id || null,
      organizations,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    }
    console.error("[GET /api/organization/me] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Unable to retrieve organization context." },
      { status: 500 }
    )
  }
}
