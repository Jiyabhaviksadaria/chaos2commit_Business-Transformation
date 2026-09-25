import { PrismaClient, OrgRole, PlatformRole, ProjectStatus, TeamConversationType } from "@prisma/client"
import { db } from "@/lib/db"

export interface SeededCompanyDef {
  slug: string
  name: string
  industry: string
  description: string
  workspaceName: string
  workspaceDescription: string
  channels: Array<{
    name: string
    description: string
    isPrivate?: boolean
  }>
  members: Array<{
    email: string
    name: string
    companyRole: string
    department: string
    orgRole: OrgRole
  }>
  project?: {
    name: string
    industry: string
    businessGoal: string
  }
}

export const SEEDED_COMPANIES: SeededCompanyDef[] = [
  {
    slug: "intelly-technologies",
    name: "Intelly Technologies",
    industry: "AI & Software",
    description: "AI-powered business transformation platform helping enterprises analyze workflows, modernize systems, and streamline operations.",
    workspaceName: "Intelly Technologies Workspace",
    workspaceDescription: "Primary workspace for Intelly Technologies team, projects, and transformation initiatives.",
    channels: [
      { name: "general", description: "Company-wide discussions, announcements, and updates", isPrivate: false },
      { name: "business-analysis", description: "Business requirements, process mapping, and workflow analysis", isPrivate: false },
      { name: "product", description: "Product strategy, roadmap, and feature specifications", isPrivate: false },
      { name: "engineering", description: "Technical architecture, engineering sprints, and code reviews", isPrivate: false },
      { name: "design", description: "UI/UX wireframes, design system, and product design reviews", isPrivate: false },
    ],
    members: [
      {
        email: "khushi@intelly.local",
        name: "Khushi Sharma",
        companyRole: "Founder / Business Analyst",
        department: "Business Analysis",
        orgRole: OrgRole.OWNER,
      },
      {
        email: "jiya@intelly.local",
        name: "Jiya Shah",
        companyRole: "Product Manager",
        department: "Product",
        orgRole: OrgRole.EDITOR,
      },
    ],
    project: {
      name: "Enterprise Workflow Optimization",
      industry: "AI / Software",
      businessGoal: "Modernize internal business processes with intelligent workflow routing and automated discovery analysis.",
    },
  },
  {
    slug: "urbannest-home",
    name: "UrbanNest Home",
    industry: "Furniture & Interior",
    description: "Modern home furniture and interior design brand operating omnichannel showrooms and direct-to-consumer digital channels.",
    workspaceName: "UrbanNest Home Workspace",
    workspaceDescription: "Dedicated company workspace for UrbanNest Home operations, logistics, and digital modernization.",
    channels: [
      { name: "general", description: "UrbanNest Home team communications and company notices", isPrivate: false },
      { name: "fulfillment", description: "Omnichannel inventory visibility, warehousing, and shipping logistics", isPrivate: false },
      { name: "store-ops", description: "Showroom retail operations, catalog syncing, and customer service", isPrivate: false },
    ],
    members: [
      {
        email: "rahul@urbannest.local",
        name: "Rahul Verma",
        companyRole: "Lead Engineer",
        department: "Engineering",
        orgRole: OrgRole.OWNER,
      },
    ],
    project: {
      name: "Retail Omnichannel Modernization",
      industry: "Furniture & Interior",
      businessGoal: "Modernize legacy in-store POS and inventory management to enable real-time omnichannel fulfillment.",
    },
  },
  {
    slug: "democorp",
    name: "DemoCorp",
    industry: "Technology",
    description: "Enterprise technology sandbox organization for multi-tenant testing, feature evaluation, and customer demonstrations.",
    workspaceName: "DemoCorp Workspace",
    workspaceDescription: "Evaluation workspace for DemoCorp testing and multi-tenant isolation verification.",
    channels: [
      { name: "general", description: "DemoCorp general collaboration and announcements", isPrivate: false },
      { name: "evaluations", description: "Technical pilots, evaluation benchmarks, and trial feedback", isPrivate: false },
    ],
    members: [
      {
        email: "alex@democorp.local",
        name: "Alex Demo",
        companyRole: "Technology Director",
        department: "Technology",
        orgRole: OrgRole.OWNER,
      },
    ],
    project: {
      name: "Cloud Migration Evaluation",
      industry: "Technology",
      businessGoal: "Assess cloud infrastructure migration, latency benchmarks, and cost efficiency.",
    },
  },
]

export const ALLOWED_COMPANY_SLUGS = SEEDED_COMPANIES.map((c) => c.slug)

/**
 * Idempotently ensures all seeded companies, workspaces, default channels,
 * and scoped demo members exist in the database.
 */
export async function ensureSeededCompanies(prismaClient?: PrismaClient) {
  const client = (prismaClient || db) as PrismaClient

  for (const def of SEEDED_COMPANIES) {
    // 1. Upsert Organization by slug
    const org = await client.organization.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
      },
      create: {
        name: def.name,
        slug: def.slug,
      },
    })

    // 2. Ensure Workspace exists for this organization
    let workspace = await client.workspace.findFirst({
      where: {
        organizationId: org.id,
        name: def.workspaceName,
      },
    })

    if (!workspace) {
      workspace = await client.workspace.create({
        data: {
          organizationId: org.id,
          name: def.workspaceName,
          description: def.workspaceDescription,
        },
      })
    }

    // 3. Ensure Channels exist in this Workspace
    for (const ch of def.channels) {
      const existingChannel = await client.teamConversation.findFirst({
        where: {
          workspaceId: workspace.id,
          type: TeamConversationType.CHANNEL,
          name: ch.name,
        },
      })

      if (!existingChannel) {
        await client.teamConversation.create({
          data: {
            workspaceId: workspace.id,
            type: TeamConversationType.CHANNEL,
            name: ch.name,
            description: ch.description,
            isPrivate: ch.isPrivate ?? false,
          },
        })
      }
    }

    // 4. Ensure Seeded Members exist and have Membership strictly in this Organization
    for (const member of def.members) {
      try {
        const user = await client.user.upsert({
          where: { email: member.email },
          update: {
            name: member.name,
            companyRole: member.companyRole,
            department: member.department,
          },
          create: {
            email: member.email,
            name: member.name,
            companyRole: member.companyRole,
            department: member.department,
            role: PlatformRole.USER,
            emailVerified: new Date(),
          },
        })

        if (user?.id && org?.id) {
          await client.membership.upsert({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: org.id,
              },
            },
            update: {
              role: member.orgRole,
            },
            create: {
              userId: user.id,
              organizationId: org.id,
              role: member.orgRole,
            },
          })
        }
      } catch {
        // Non-critical if user or membership already handled
      }
    }

    // 5. Ensure Company Project exists in this workspace
    if (def.project) {
      const existingProject = await client.project.findFirst({
        where: {
          workspaceId: workspace.id,
          name: def.project.name,
        },
      })

      if (!existingProject) {
        await client.project.create({
          data: {
            workspaceId: workspace.id,
            name: def.project.name,
            industry: def.project.industry,
            businessGoal: def.project.businessGoal,
            status: ProjectStatus.ACTIVE,
            language: "en",
          },
        })
      }
    }
  }
}
