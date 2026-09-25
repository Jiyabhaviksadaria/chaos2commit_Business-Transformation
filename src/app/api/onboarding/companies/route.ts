import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ensureSeededCompanies, SEEDED_COMPANIES, ALLOWED_COMPANY_SLUGS } from "@/lib/companies/seed-companies"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    // 1. Ensure seeded companies exist idempotently
    await ensureSeededCompanies()

    // 2. Optional session lookup to determine if the requester is logged in
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // 3. Find all seeded organizations from the database
    const orgs = await db.organization.findMany({
      where: {
        slug: { in: ALLOWED_COMPANY_SLUGS },
      },
      include: {
        workspaces: {
          select: { id: true, name: true },
          take: 1,
        },
        memberships: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    let userMembershipCount = 0
    if (userId) {
      userMembershipCount = await db.membership.count({
        where: { userId },
      })
    }

    const companies = orgs.map((org) => {
      const def = SEEDED_COMPANIES.find((c) => c.slug === org.slug)
      const isMember = userId ? org.memberships.some((m) => m.userId === userId) : false

      return {
        id: org.id,
        slug: org.slug,
        name: org.name,
        industry: def?.industry || "Technology",
        description: def?.description || "",
        workspaceId: org.workspaces[0]?.id || null,
        workspaceName: org.workspaces[0]?.name || null,
        memberCount: org.memberships.length,
        isMember,
      }
    })

    return NextResponse.json({
      ok: true,
      companies,
      membershipCount: userMembershipCount,
      authenticated: Boolean(userId),
    })
  } catch (error) {
    console.error("[GET /api/onboarding/companies] Error:", error)
    return NextResponse.json(
      { ok: false, error: "Unable to load company list." },
      { status: 500 }
    )
  }
}
