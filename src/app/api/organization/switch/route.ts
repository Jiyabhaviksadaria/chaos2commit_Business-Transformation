import { NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const switchOrgSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required."),
})

export async function POST(req: Request) {
  try {
    const user = await requireUser()

    const body = await req.json().catch(() => ({}))
    const parsed = switchOrgSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid organization." },
        { status: 400 }
      )
    }

    const { organizationId } = parsed.data

    // 1. Verify user's membership in this organization (strict server-side tenancy enforcement)
    const membership = await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
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
    })

    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "You are not a member of this organization." },
        { status: 403 }
      )
    }

    const org = membership.organization
    let workspace = org.workspaces[0]
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          organizationId: org.id,
          name: `${org.name} Workspace`,
        },
      })
    }

    const response = NextResponse.json({
      ok: true,
      organizationId: org.id,
      organizationName: org.name,
      workspaceId: workspace.id,
      redirectUrl: "/dashboard",
      message: `Active workspace switched to ${org.name}.`,
    })

    response.cookies.set("intelly_active_org", org.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 })
    }
    console.error("[POST /api/organization/switch] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Unable to switch workspace." },
      { status: 500 }
    )
  }
}
