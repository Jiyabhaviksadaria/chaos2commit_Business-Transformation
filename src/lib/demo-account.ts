import { OrgPlan, OrgRole, PlatformRole, Prisma, ProjectLifecycle, ProjectStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { demoBusinessData } from "@/lib/demo-business-data"

export const DEMO_USER_ID = "demo-user-intelly"
export const DEMO_USER_EMAIL = "demo@intelly.app"
export const DEMO_ORGANIZATION_ID = "demo-org-intelly"
export const DEMO_WORKSPACE_ID = "demo-workspace-intelly"
export const DEMO_PROJECT_ID = "demo-project-intelly"
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
      companyRole: "Business Analyst",
      role: PlatformRole.USER,
      emailVerified: new Date(),
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      name: "Intelly Demo User",
      companyRole: "Business Analyst",
      role: PlatformRole.USER,
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

  return {
    user,
    organization,
    workspace,
    project,
    projectId: project.id,
  }
}
