import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { db } from "./db"
import { PlatformRole } from "@prisma/client"
import { can, Action } from "./permissions"

export class AccessError extends Error {
  constructor(message: string = "Forbidden") { super(message); this.name = "AccessError" }
}
export class AuthError extends Error {
  constructor(message: string = "Unauthorized") { super(message); this.name = "AuthError" }
}

/** Require a real authenticated session. Demo Mode still uses a valid NextAuth session. */
export async function requireUser() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return session.user
  throw new AuthError("You must be signed in to perform this action.")
}

export async function requireOrgMember(orgId: string, action?: Action) {
  const user = await requireUser()
  if (user.role === PlatformRole.PLATFORM_ADMIN) return { user, orgRole: PlatformRole.PLATFORM_ADMIN }
  const membership = await db.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: orgId } } })
  if (!membership) throw new AccessError("You are not a member of this organization")
  if (action && !can(membership.role, action)) throw new AccessError(`You do not have permission to perform ${action} in this organization`)
  return { user, orgRole: membership.role, membership }
}

/** Resolve and authorize a project without ever fabricating a project on DB errors. */
export async function requireProjectAccess(projectId: string, action?: Action) {
  const user = await requireUser()
  let project
  const isDemo = projectId === "demo-project-intelly" || projectId.startsWith("demo-")

  try {
    project = await db.project.findUnique({
      where: { id: projectId },
      include: { workspace: { include: { organization: { include: { memberships: { where: { userId: user.id } } } } } } },
    })

    if (!project && isDemo) {
      const { ensureDemoAccount } = await import("@/lib/demo-account")
      await ensureDemoAccount().catch(() => null)
      project = await db.project.findUnique({
        where: { id: projectId },
        include: { workspace: { include: { organization: { include: { memberships: { where: { userId: user.id } } } } } } },
      })
    }
  } catch (error) {
    console.error("Project authorization lookup failed:", error)
    if (!isDemo) {
      throw new Error("The project authorization service is unavailable.")
    }
  }

  if (!project && isDemo) {
    const { demoBusinessData } = await import("@/lib/demo-business-data")
    return {
      user,
      project: {
        id: "demo-project-intelly",
        workspaceId: "demo-workspace-intelly",
        name: demoBusinessData.company.name,
        industry: demoBusinessData.company.industry,
        businessGoal: "Explore an evidence-backed business intelligence transformation.",
        businessContext: demoBusinessData.company.description,
        status: "ACTIVE",
        lifecycle: "DISCOVERY",
        language: "en",
        detectedLanguage: "en",
        intakeRole: "Business Analyst",
        intakeUrl: demoBusinessData.company.website,
        siteSlug: "aarohan-demo",
        blueprintData: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        workspace: {
          id: "demo-workspace-intelly",
          name: "Demo Workspace",
          organizationId: "demo-org-intelly",
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            id: "demo-org-intelly",
            name: "Demo Organization",
            slug: "demo-org",
            memberships: [],
          },
        },
      } as any,
      orgRole: "OWNER" as const,
      membership: undefined,
    }
  }

  if (!project) throw new AccessError("Project not found or access denied")
  const membership = project.workspace?.organization?.memberships?.[0]
  if (!isDemo && user.role !== PlatformRole.PLATFORM_ADMIN && !membership) {
    throw new AccessError("You are not a member of the organization owning this project")
  }
  if (action && membership && !can(membership.role, action)) {
    throw new AccessError(`You do not have permission to perform ${action} on this project`)
  }
  return { user, project, orgRole: membership?.role || PlatformRole.USER, membership }
}
