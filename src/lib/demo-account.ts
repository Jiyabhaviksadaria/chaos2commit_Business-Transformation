import { OrgPlan, OrgRole, PlatformRole, Prisma, ProjectLifecycle, ProjectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { DEMO_PROJECT_ID, demoBusinessData } from "@/lib/demo-business-data"

export const DEMO_USER_ID = "demo-user-intelly"
export const DEMO_USER_EMAIL = "demo@intelly.app"
export const DEMO_ORGANIZATION_ID = "demo-org-intelly"
export const DEMO_WORKSPACE_ID = "demo-workspace-intelly"
export const DEMO_MODE_RESTRICTION_MESSAGE = "This action isn't available in Demo Mode. Sign in with a real account to continue."

export function isDemoIdentity(value: { id?: string | null; email?: string | null } | null | undefined): boolean {
  return value?.id === DEMO_USER_ID || value?.email?.toLowerCase() === DEMO_USER_EMAIL
}

function demoMetadata() {
  return {
    isDemo: true,
    demoDataVersion: "1",
    companyContext: {
      companyName: demoBusinessData.company.name,
      companyWebsite: demoBusinessData.company.website,
      industry: demoBusinessData.company.industry,
      companySize: `${demoBusinessData.company.employees} employees`,
      currentTools: demoBusinessData.company.primaryProducts,
      businessObjective: "Illustrative business intelligence transformation",
      userRole: "Business Analyst",
    },
    discovery: {
      status: "ANALYSIS_COMPLETE",
      progress: 100,
      readyForAnalysis: true,
      questions: [],
      understanding: {
        confirmedFacts: [],
        currentProcess: [],
        observedProblems: [],
        potentialRootCauses: [],
        unknowns: [],
        constraints: [],
        evidence: [],
        businessImpact: [],
      },
      lastUpdatedAt: new Date().toISOString(),
    },
  }
}

export async function ensureDemoAccount() {
  const existingByEmail = await db.user.findUnique({ where: { email: DEMO_USER_EMAIL } })
  if (existingByEmail && existingByEmail.id !== DEMO_USER_ID) {
    throw new Error("The dedicated demo identity is already in use.")
  }

  const user = await db.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      email: DEMO_USER_EMAIL,
      name: "Intelly Demo User",
      role: PlatformRole.USER,
      passwordHash: null,
      emailVerified: new Date(),
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      name: "Intelly Demo User",
      role: PlatformRole.USER,
      passwordHash: null,
      emailVerified: new Date(),
    },
  })

  const organization = await db.organization.upsert({
    where: { id: DEMO_ORGANIZATION_ID },
    update: {
      name: "Intelly Demo Organization",
      slug: "intelly-demo",
      plan: OrgPlan.FREE,
      creditBalance: 0,
    },
    create: {
      id: DEMO_ORGANIZATION_ID,
      name: "Intelly Demo Organization",
      slug: "intelly-demo",
      plan: OrgPlan.FREE,
      creditBalance: 0,
    },
  })

  const workspace = await db.workspace.upsert({
    where: { id: DEMO_WORKSPACE_ID },
    update: { organizationId: organization.id, name: "Intelly Demo Workspace" },
    create: { id: DEMO_WORKSPACE_ID, organizationId: organization.id, name: "Intelly Demo Workspace" },
  })

  await db.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: OrgRole.OWNER },
    create: { userId: user.id, organizationId: organization.id, role: OrgRole.OWNER },
  })

  const businessContent = [
    `Company: ${demoBusinessData.company.name}`,
    `Industry: ${demoBusinessData.company.industry}`,
    `Headquarters: ${demoBusinessData.company.headquarters}`,
    `Business model: ${demoBusinessData.company.businessModel}`,
    `Business description: ${demoBusinessData.company.description}`,
  ].join("\n")

  const project = await db.project.upsert({
    where: { id: DEMO_PROJECT_ID },
    update: {
      workspaceId: workspace.id,
      name: demoBusinessData.company.name,
      industry: demoBusinessData.company.industry,
      businessGoal: "Explore an evidence-backed business intelligence transformation.",
      businessContext: demoBusinessData.company.description,
      status: ProjectStatus.ACTIVE,
      lifecycle: ProjectLifecycle.DISCOVERY,
      language: "en",
      detectedLanguage: "en",
    },
    create: {
      id: DEMO_PROJECT_ID,
      workspaceId: workspace.id,
      name: demoBusinessData.company.name,
      industry: demoBusinessData.company.industry,
      businessGoal: "Explore an evidence-backed business intelligence transformation.",
      businessContext: demoBusinessData.company.description,
      status: ProjectStatus.ACTIVE,
      lifecycle: ProjectLifecycle.DISCOVERY,
      language: "en",
      detectedLanguage: "en",
    },
  })

  await db.projectContext.upsert({
    where: { projectId: project.id },
    update: {
      extractedText: demoBusinessData.company.description,
      businessContent,
      metadata: demoMetadata() as Prisma.InputJsonValue,
      sourceTypes: [] as Prisma.InputJsonValue,
      answers: [] as Prisma.InputJsonValue,
    },
    create: {
      projectId: project.id,
      extractedText: demoBusinessData.company.description,
      businessContent,
      metadata: demoMetadata() as Prisma.InputJsonValue,
      sources: [] as Prisma.InputJsonValue,
      sourceTypes: [] as Prisma.InputJsonValue,
      answers: [] as Prisma.InputJsonValue,
    },
  })

  // Seed deliverables for demo project
  const { DeliverableType, VersionSource } = await import("@prisma/client")
  const { 
    HR_INTAKE_FIXTURE, 
    HR_SYSTEM_FIXTURE, 
    HR_WEBSITE_FIXTURE,
    HR_REQUIREMENTS_FIXTURE,
    HR_SOLUTION_RECOMMENDATION_FIXTURE,
    HR_ARCHITECTURE_HLD_FIXTURE,
    HR_PROCESS_MAP_FIXTURE,
    HR_WIREFRAMES_FIXTURE,
    HR_DATABASE_DESIGN_FIXTURE,
    HR_API_DESIGN_FIXTURE,
    HR_ESTIMATION_FIXTURE,
    HR_ROADMAP_FIXTURE,
    HR_GAP_ANALYSIS_FIXTURE
  } = await import("@/modules/fixtures/hr-fixtures")

  const demoDeliverables = [
    { type: DeliverableType.INTAKE_ANALYSIS, content: HR_INTAKE_FIXTURE, title: "Intake Analysis" },
    { type: DeliverableType.SYSTEM_SPEC, content: HR_SYSTEM_FIXTURE, title: "System Specification" },
    { type: DeliverableType.WEBSITE_SPEC, content: HR_WEBSITE_FIXTURE, title: "Website Specification" },
    { type: DeliverableType.REQUIREMENTS, content: HR_REQUIREMENTS_FIXTURE, title: "Requirements Specification" },
    { type: DeliverableType.SOLUTION_RECOMMENDATION, content: HR_SOLUTION_RECOMMENDATION_FIXTURE, title: "Solution Recommendations" },
    { type: DeliverableType.ARCHITECTURE_HLD, content: HR_ARCHITECTURE_HLD_FIXTURE, title: "Solution Architecture (HLD)" },
    { type: DeliverableType.PROCESS_MAP, content: HR_PROCESS_MAP_FIXTURE, title: "Process Map & Workflow" },
    { type: DeliverableType.WIREFRAMES, content: HR_WIREFRAMES_FIXTURE, title: "UI/UX & Screen Concepts" },
    { type: DeliverableType.DATABASE_DESIGN, content: HR_DATABASE_DESIGN_FIXTURE, title: "Database Schema Design" },
    { type: DeliverableType.API_DESIGN, content: HR_API_DESIGN_FIXTURE, title: "API Endpoint Specs" },
    { type: DeliverableType.ESTIMATION, content: HR_ESTIMATION_FIXTURE, title: "Planning & Effort Estimation" },
    { type: DeliverableType.ROADMAP, content: HR_ROADMAP_FIXTURE, title: "Transformation Roadmap" },
    { type: DeliverableType.GAP_ANALYSIS, content: HR_GAP_ANALYSIS_FIXTURE, title: "Gap Analysis & Capability Assessment" }
  ]

  for (const item of demoDeliverables) {
    let deliverable = await db.deliverable.findFirst({
      where: { projectId: project.id, type: item.type }
    })
    if (!deliverable) {
      deliverable = await db.deliverable.create({
        data: { projectId: project.id, type: item.type, title: item.title, status: "APPROVED" }
      })
    }
    const existingVersion = await db.deliverableVersion.findFirst({ where: { deliverableId: deliverable.id } })
    if (!existingVersion) {
      const version = await db.deliverableVersion.create({
        data: {
          deliverableId: deliverable.id,
          versionNumber: 1,
          content: item.content as Prisma.InputJsonValue,
          source: VersionSource.AI,
          language: "en",
          createdById: user.id,
          note: "Seeded demo deliverable"
        }
      })
      await db.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
    }
  }

  return {
    user,
    organization,
    workspace,
    project,
    projectId: project.id,
  }
}
