import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/access"
import { DeliverableType, VersionSource, ProjectStatus } from "@prisma/client"
import { HR_INTAKE_FIXTURE, HR_SYSTEM_FIXTURE, HR_WEBSITE_FIXTURE } from "@/modules/fixtures/hr-fixtures"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const user = await requireUser()
    const orgId = user.organizationId || "demo-org"

    const organization = await db.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: "Default Organization",
        slug: `org-${orgId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
    })

    let workspace = await db.workspace.findFirst({ where: { organizationId: organization.id } })
    if (!workspace) {
      workspace = await db.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Default Workspace",
        },
      })
    }

    // Public demo mode has no authenticated database user. Persist the fallback
    // identity so foreign keys remain valid for deliverable versions and records.
    const demoUser = await db.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email || "demo@demo.com",
        name: user.name || "Demo User",
        companyRole: user.companyRole,
        role: user.role,
      },
    })

    await db.membership.upsert({
      where: {
        userId_organizationId: {
          userId: demoUser.id,
          organizationId: organization.id,
        },
      },
      update: {},
      create: {
        userId: demoUser.id,
        organizationId: organization.id,
        role: "OWNER",
      },
    })

    // Create the demo project
    const project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: "HR Consultancy (Demo)",
        industry: "Human Resources & Staffing",
        businessGoal: "I am starting an HR consultancy. I have company, candidate and client information. I need a company website, CRM (companies, candidates, clients), attendance system, and client onboarding system.",
        status: ProjectStatus.ACTIVE,
        language: "en",
        detectedLanguage: "en",
        siteSlug: `hr-demo-${Date.now()}`
      }
    })

    // Add intake source
    await db.intakeSource.create({
      data: {
        projectId: project.id,
        kind: "IDEA",
        label: "HR Consultancy business idea",
        extractedText: project.businessGoal,
        status: "READY"
      }
    })

    // Create deliverables with fixtures (NO AI calls)
    const deliverableTypes: Array<{ type: DeliverableType; content: unknown; title: string }> = [
      { type: DeliverableType.INTAKE_ANALYSIS, content: HR_INTAKE_FIXTURE, title: "Intake Analysis" },
      { type: DeliverableType.SYSTEM_SPEC, content: HR_SYSTEM_FIXTURE, title: "System Specification" },
      { type: DeliverableType.WEBSITE_SPEC, content: HR_WEBSITE_FIXTURE, title: "Website Specification" },
    ]

    for (const { type, content, title } of deliverableTypes) {
      const deliverable = await db.deliverable.create({
        data: { projectId: project.id, type, title, status: "APPROVED" }
      })
      const version = await db.deliverableVersion.create({
        data: {
          deliverableId: deliverable.id,
          versionNumber: 1,
          content: content as import("@prisma/client").Prisma.InputJsonValue,
          source: VersionSource.AI,
          language: "en",
          createdById: user.id,
          note: "Demo fixture — no AI calls"
        }
      })
      await db.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
    }

    // Insert sample records for all 4 modules
    const sampleData: Record<string, Array<Record<string, unknown>>> = {
      candidates: [
        { name: "Rahul Sharma", email: "rahul@example.com", phone: "+91 98765 43210", stage: "Interview", expected_salary: 65000, notes: "5 years exp in IT recruitment" },
        { name: "Priya Patel", email: "priya@example.com", phone: "+91 87654 32109", stage: "Placed", expected_salary: 75000, notes: "Strong communication skills" },
        { name: "Amit Kumar", email: "amit@example.com", phone: "+91 76543 21098", stage: "Screening", expected_salary: 55000, notes: "Fresh MBA graduate" },
        { name: "Sneha Singh", email: "sneha@example.com", phone: "+91 65432 10987", stage: "Applied", expected_salary: 50000, notes: "Looking for sales roles" },
        { name: "Vikram Mehta", email: "vikram@example.com", phone: "+91 54321 09876", stage: "Offer", expected_salary: 80000, notes: "Senior candidate, needs quick processing" }
      ],
      clients: [
        { company_name: "TechCorp India", contact_name: "Suresh Agarwal", email: "suresh@techcorp.in", phone: "+91 11223 34455", industry: "Technology", status: "Active", requirements: "Need 3 senior React developers urgently" },
        { company_name: "FinServ Ltd", contact_name: "Anita Sharma", email: "anita@finserv.com", phone: "+91 22334 45566", industry: "Finance", status: "Active", requirements: "Hiring 5 CA qualified finance managers" },
        { company_name: "RetailX", contact_name: "Deepak Joshi", email: "deepak@retailx.com", phone: "+91 33445 56677", industry: "Retail", status: "Prospect", requirements: "Supply chain and operations roles" },
        { company_name: "MedPlus Healthcare", contact_name: "Dr. Kavita Rao", email: "kavita@medplus.com", phone: "+91 44556 67788", industry: "Healthcare", status: "On Hold", requirements: "Medical staff recruitment on hold" },
        { company_name: "BuildRight", contact_name: "Ranjit Singh", email: "ranjit@buildright.in", phone: "+91 55667 78899", industry: "Construction", status: "Active", requirements: "Site managers and civil engineers" }
      ],
      attendance: [
        { employee_name: "Priya Patel", date: new Date().toISOString().slice(0, 10), check_in: new Date(Date.now() - 8 * 3600000).toISOString(), check_out: new Date(Date.now() - 1 * 3600000).toISOString(), status: "Present" },
        { employee_name: "Rahul Sharma", date: new Date().toISOString().slice(0, 10), check_in: new Date(Date.now() - 7 * 3600000).toISOString(), check_out: null, status: "Present" },
        { employee_name: "Amit Kumar", date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), check_in: null, check_out: null, status: "Absent" }
      ],
      onboarding: [
        { client_name: "TechCorp India", onboarding_stage: "Go Live", assigned_consultant: "Priya Patel", start_date: "2024-01-15", notes: "Smooth onboarding, very cooperative client" },
        { client_name: "FinServ Ltd", onboarding_stage: "Requirements Gathering", assigned_consultant: "Rahul Sharma", start_date: "2024-02-01", notes: "Complex requirements, multiple stakeholders" },
        { client_name: "RetailX", onboarding_stage: "Agreement", assigned_consultant: "Amit Kumar", start_date: "2024-02-15", notes: "Negotiating SLA terms" }
      ]
    }

    for (const [moduleKey, records] of Object.entries(sampleData)) {
      for (const record of records) {
        await db.generatedRecord.create({
          data: {
            projectId: project.id,
            moduleKey,
            data: record as import("@prisma/client").Prisma.InputJsonValue,
            createdById: user.id
          }
        })
      }
    }

    return NextResponse.json({ ok: true, data: { projectId: project.id } })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
