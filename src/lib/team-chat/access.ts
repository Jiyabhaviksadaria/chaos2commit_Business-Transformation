import { db } from "@/lib/db"
import { requireUser, AccessError } from "@/lib/access"
import { PlatformRole, OrgRole, TeamConversationType, TeamMemberRole } from "@prisma/client"
import { SEEDED_COMPANIES } from "@/lib/companies/seed-companies"

export const DEFAULT_CHANNELS = [
  { name: "general", description: "Company-wide discussions, announcements, and updates", isPrivate: false },
  { name: "product", description: "Product strategy, roadmap, and feature specifications", isPrivate: false },
  { name: "engineering", description: "Technical architecture, engineering sprints, and code reviews", isPrivate: false },
  { name: "design", description: "UI/UX wireframes, design system, and product design reviews", isPrivate: false },
  { name: "business-analysis", description: "Business requirements, process mapping, and workflow analysis", isPrivate: false },
]

/**
 * Ensures company-specific department teammates exist only for their designated organization.
 * Maintains strict multi-tenant boundaries: Intelly members only belong to Intelly,
 * UrbanNest members only belong to UrbanNest.
 */
export async function ensureDefaultWorkspaceTeam(organizationId: string) {
  try {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    })
    if (!org) return

    // Find if this organization matches a seeded company definition
    const seededDef = SEEDED_COMPANIES.find((c) => c.slug === org.slug)
    if (!seededDef) return

    for (const m of seededDef.members) {
      try {
        const user = await db.user.upsert({
          where: { email: m.email },
          update: {
            name: m.name,
            companyRole: m.companyRole,
            department: m.department,
          },
          create: {
            email: m.email,
            name: m.name,
            companyRole: m.companyRole,
            department: m.department,
            role: PlatformRole.USER,
            emailVerified: new Date(),
          },
        })

        await db.membership.upsert({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId,
            },
          },
          update: { role: m.orgRole },
          create: {
            userId: user.id,
            organizationId,
            role: m.orgRole,
          },
        })
      } catch {
        // Ignore duplicate key or existing record
      }
    }
  } catch {
    // Non-critical
  }
}

/**
 * Ensures default public channels exist in a workspace according to its organization profile.
 */
export async function ensureDefaultWorkspaceChannels(workspaceId: string, createdById?: string) {
  try {
    const ws = await db.workspace.findUnique({
      where: { id: workspaceId },
      include: { organization: true },
    })

    const seededDef = ws ? SEEDED_COMPANIES.find((c) => c.slug === ws.organization.slug) : null
    const channelsToEnsure = seededDef?.channels || DEFAULT_CHANNELS

    for (const ch of channelsToEnsure) {
      const existing = await db.teamConversation.findFirst({
        where: {
          workspaceId,
          type: TeamConversationType.CHANNEL,
          name: ch.name,
        },
      })

      if (!existing) {
        await db.teamConversation.create({
          data: {
            workspaceId,
            type: TeamConversationType.CHANNEL,
            name: ch.name,
            description: ch.description,
            isPrivate: ch.isPrivate ?? false,
            createdById: createdById || null,
          },
        })
      }
    }

    // Ensure company-specific project exists if configured
    if (seededDef?.project && ws) {
      let companyProject = await db.project.findFirst({
        where: {
          workspaceId,
          name: seededDef.project.name,
        },
      })

      if (!companyProject) {
        companyProject = await db.project.create({
          data: {
            workspaceId,
            name: seededDef.project.name,
            industry: seededDef.project.industry,
            businessGoal: seededDef.project.businessGoal,
            status: "ACTIVE",
            language: "en",
          },
        })
      }
    }
  } catch {
    // Non-critical
  }
}

/**
 * Resolves the authenticated user's workspace, verifying tenancy boundaries.
 */
export async function resolveUserWorkspace(requestedWorkspaceId?: string | null) {
  const user = await requireUser()

  if (requestedWorkspaceId) {
    const workspace = await db.workspace.findUnique({
      where: { id: requestedWorkspaceId },
      include: {
        organization: {
          include: {
            memberships: {
              where: { userId: user.id },
            },
          },
        },
      },
    })

    if (!workspace) {
      throw new AccessError("Workspace not found")
    }

    const isPlatformAdmin = user.role === PlatformRole.PLATFORM_ADMIN
    const membership = workspace.organization.memberships[0]

    if (!isPlatformAdmin && !membership) {
      throw new AccessError("You do not have access to this workspace")
    }

    await ensureDefaultWorkspaceChannels(workspace.id, user.id)
    await ensureDefaultWorkspaceTeam(workspace.organizationId)

    return { workspace, user, orgRole: membership?.role || OrgRole.VIEWER }
  }

  // If no workspace requested, resolve from user's memberships
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          workspaces: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  if (memberships.length === 0) {
    throw new AccessError("You do not belong to an organization yet. Please select your company first.")
  }

  // Pick target membership (first authorized membership or matching organization)
  const targetMembership = memberships[0]
  let foundWorkspace = targetMembership.organization.workspaces[0]
  const currentOrgId = targetMembership.organizationId

  if (!foundWorkspace) {
    foundWorkspace = await db.workspace.create({
      data: {
        organizationId: currentOrgId,
        name: `${targetMembership.organization.name} Workspace`,
        description: "Primary workspace",
      },
    })
  }

  await ensureDefaultWorkspaceChannels(foundWorkspace.id, user.id)
  await ensureDefaultWorkspaceTeam(foundWorkspace.organizationId)

  return {
    workspace: foundWorkspace,
    user,
    orgRole: targetMembership.role,
  }
}

/**
 * Authorizes access to a specific team conversation and checks tenancy.
 */
export async function requireConversationAccess(conversationId: string) {
  const user = await requireUser()

  const conversation = await db.teamConversation.findUnique({
    where: { id: conversationId },
    include: {
      workspace: {
        include: {
          organization: {
            include: {
              memberships: {
                where: { userId: user.id },
              },
            },
          },
        },
      },
      members: {
        where: { userId: user.id },
      },
    },
  })

  if (!conversation) {
    throw new AccessError("Conversation not found")
  }

  const isPlatformAdmin = user.role === PlatformRole.PLATFORM_ADMIN
  const isOrgMember = isPlatformAdmin || conversation.workspace.organization.memberships.length > 0

  if (!isOrgMember) {
    throw new AccessError("You do not have access to this workspace")
  }

  const isMember = conversation.members.length > 0

  // Public channels are accessible to all workspace members
  if (conversation.type === TeamConversationType.CHANNEL && !conversation.isPrivate) {
    return {
      conversation,
      user,
      isMember,
      membership: conversation.members[0] || null,
    }
  }

  // Private channels, DMs, and Groups require explicit membership
  if (!isMember && !isPlatformAdmin) {
    throw new AccessError("You are not a member of this private conversation")
  }

  return {
    conversation,
    user,
    isMember: true,
    membership: conversation.members[0] || null,
  }
}

/**
 * Ensures user is recorded as a member in the conversation and updates lastReadAt.
 */
export async function markConversationRead(conversationId: string, userId: string) {
  return await db.teamConversationMember.upsert({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    update: {
      lastReadAt: new Date(),
    },
    create: {
      conversationId,
      userId,
      role: TeamMemberRole.MEMBER,
      lastReadAt: new Date(),
    },
  })
}
