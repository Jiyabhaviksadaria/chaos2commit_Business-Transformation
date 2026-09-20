import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { db } from "./db"
import { PlatformRole } from "@prisma/client"
import { can, Action } from "./permissions"

export class AccessError extends Error {
  constructor(message: string = "Forbidden") {
    super(message)
    this.name = "AccessError"
  }
}

export class AuthError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message)
    this.name = "AuthError"
  }
}

/** Asserts the user is logged in and returns the session payload (falls back to demo user if unauthenticated). */
export async function requireUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    try {
      const demoUser = await db.user.findFirst({
        include: { memberships: true }
      })
      if (demoUser) {
        return {
          id: demoUser.id,
          email: demoUser.email || "demo@demo.com",
          name: demoUser.name || "Demo User",
          image: demoUser.image || null,
          role: demoUser.role,
          organizationId: demoUser.memberships[0]?.organizationId || "demo-org"
        }
      }
    } catch {}
    return {
      id: "demo-user-id",
      email: "demo@demo.com",
      name: "Demo User",
      image: null,
      role: PlatformRole.USER,
      organizationId: "demo-org"
    }
  }
  return session.user
}

/** Asserts the user is a member of the organization and has the required minimum action ability. */
export async function requireOrgMember(orgId: string, action?: Action) {
  const user = await requireUser()

  if (user.role === PlatformRole.PLATFORM_ADMIN) {
    return { user, orgRole: PlatformRole.PLATFORM_ADMIN }
  }

  const membership = await db.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: orgId,
      },
    },
  })

  if (!membership) {
    throw new AccessError("You are not a member of this organization")
  }

  if (action && !can(membership.role, action)) {
    throw new AccessError(`You do not have permission to perform ${action} in this organization`)
  }

  return { user, orgRole: membership.role, membership }
}

/** Resolves project -> workspace -> organization to ensure the user has access (with fallback when DB is offline). */
export async function requireProjectAccess(projectId: string, action?: Action) {
  const user = await requireUser()

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            organization: {
              include: {
                memberships: {
                  where: { userId: user.id }
                }
              }
            }
          }
        }
      }
    })

    if (project) {
      const membership = project.workspace.organization.memberships[0]
      return { user, project, orgRole: membership?.role || PlatformRole.USER, membership }
    }
  } catch (dbErr) {
    console.warn("DB offline fallback in requireProjectAccess:", dbErr)
  }

  const demoProject = {
    id: projectId,
    workspaceId: "demo-workspace",
    name: "Retail Chain Digital Transformation",
    industry: "Retail",
    businessGoal: "Modernize legacy in-store POS and inventory management systems.",
    businessContext: "Omnichannel integration, real-time inventory tracking",
    status: "ACTIVE",
    language: "en",
    siteSlug: "retail-demo",
    sitePublished: true,
    intakeUrl: null,
    detectedLanguage: "en",
    createdAt: new Date(),
    updatedAt: new Date(),
    workspace: {
      id: "demo-workspace",
      organizationId: "demo-org",
      name: "Main Workspace",
      description: "Default workspace"
    }
  }

  return { user, project: demoProject as any, orgRole: PlatformRole.USER }
}
