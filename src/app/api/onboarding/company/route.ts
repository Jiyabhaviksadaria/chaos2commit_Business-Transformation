import { NextResponse } from "next/server"
import { z } from "zod"
import { OrgRole } from "@prisma/client"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { ALLOWED_COMPANY_SLUGS, ensureSeededCompanies } from "@/lib/companies/seed-companies"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const selectCompanySchema = z.object({
  companyId: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
}).refine((data) => Boolean(data.companyId || data.slug), {
  message: "Either companyId or slug must be provided.",
})

export async function POST(req: Request) {
  try {
    const user = await requireUser()

    const body = await req.json().catch(() => ({}))
    const parsed = selectCompanySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Invalid selection details." },
        { status: 400 }
      )
    }

    const { companyId, slug } = parsed.data

    // Ensure seeded companies exist in case this is called in a fresh environment
    await ensureSeededCompanies()

    // Find the organization
    const org = await db.organization.findFirst({
      where: {
        OR: [
          companyId ? { id: companyId } : undefined,
          slug ? { slug } : undefined,
        ].filter(Boolean) as Array<{ id?: string; slug?: string }>,
      },
      include: {
        workspaces: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!org || !ALLOWED_COMPANY_SLUGS.includes(org.slug)) {
      return NextResponse.json(
        { ok: false, error: "The selected company is not recognized. Please choose from the available demo companies." },
        { status: 400 }
      )
    }

    // Check if membership already exists
    const existingMembership = await db.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
    })

    let workspace = org.workspaces[0]
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          organizationId: org.id,
          name: `${org.name} Workspace`,
          description: `Primary workspace for ${org.name}.`,
        },
      })
    }

    if (existingMembership) {
      const response = NextResponse.json({
        ok: true,
        alreadyMember: true,
        organizationId: org.id,
        workspaceId: workspace.id,
        redirectUrl: "/dashboard",
        message: `You're already a member of ${org.name}.`,
      })
      response.cookies.set("intelly_active_org", org.id, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return response
    }

    // Create server-side membership with EDITOR role (non-owner employee)
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: OrgRole.EDITOR,
      },
    })

    // Log the membership creation
    try {
      await db.activityLog.create({
        data: {
          organizationId: org.id,
          actorId: user.id,
          action: "user:join_company",
          entity: "Organization",
          entityId: org.id,
          metadata: {
            companyName: org.name,
            roleAssigned: OrgRole.EDITOR,
            userEmail: user.email,
          },
        },
      })
    } catch {
      // Non-critical if logging fails
    }

    const response = NextResponse.json({
      ok: true,
      alreadyMember: false,
      organizationId: org.id,
      workspaceId: workspace.id,
      redirectUrl: "/dashboard",
      message: `Successfully joined ${org.name}!`,
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
      return NextResponse.json({ ok: false, error: "Please sign in to select a company." }, { status: 401 })
    }
    console.error("[POST /api/onboarding/company] Error:", error)
    return NextResponse.json(
      { ok: false, error: "We couldn't connect you to this company. Please try again." },
      { status: 500 }
    )
  }
}
