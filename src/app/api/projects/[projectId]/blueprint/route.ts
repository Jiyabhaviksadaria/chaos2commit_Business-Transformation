/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"
import { z } from "zod"

const BlueprintSchema = z.object({
  productOverview: z.string().default(""),
  businessObjective: z.string().default(""),
  productObjective: z.string().default(""),
  targetUsers: z.array(z.string()).default([]),
  userRoles: z.array(z.object({
    role: z.string(),
    description: z.string(),
    permissions: z.array(z.string())
  })).default([]),
  userJourneys: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string())
  })).default([]),
  modules: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string()
  })).default([]),
  features: z.array(z.object({
    key: z.string(),
    title: z.string(),
    moduleKey: z.string(),
    priority: z.string()
  })).default([]),
  requirements: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.enum(["KNOWN", "UNKNOWN", "ASSUMED", "REQUIRES_DECISION"]),
    description: z.string(),
    priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    status: z.string(),
    explainability: z.object({
      why: z.string(),
      contextUsed: z.string(),
      evidence: z.string(),
      assumptions: z.string(),
      alternatives: z.string(),
      confidence: z.number()
    }).optional()
  })).default([]),
  nonFunctionalRequirements: z.array(z.object({
    category: z.string(),
    description: z.string()
  })).default([]),
  businessRules: z.array(z.object({
    ruleId: z.string(),
    title: z.string(),
    rule: z.string()
  })).default([]),
  workflows: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    steps: z.array(z.string())
  })).default([]),
  integrations: z.array(z.object({
    name: z.string(),
    type: z.string(),
    details: z.string()
  })).default([]),
  aiFeatures: z.array(z.object({
    name: z.string(),
    description: z.string(),
    model: z.string()
  })).default([]),
  dataEntities: z.array(z.object({
    name: z.string(),
    fields: z.array(z.string())
  })).default([]),
  security: z.object({
    auth: z.string().default("NextAuth OAuth2 + JWT"),
    rbac: z.boolean().default(true),
    compliance: z.array(z.string()).default([])
  }).default({ auth: "NextAuth OAuth2 + JWT", rbac: true, compliance: [] }),
  architecture: z.object({
    type: z.string().default("Next.js 14 App Router"),
    stack: z.array(z.string()).default(["TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL"])
  }).default({ type: "Next.js 14 App Router", stack: ["TypeScript", "Tailwind CSS", "Prisma", "PostgreSQL"] }),
  ux: z.object({
    theme: z.string().default("Intelly Modern Pastel"),
    layout: z.string().default("Dark Sidebar Dashboard")
  }).default({ theme: "Intelly Modern Pastel", layout: "Dark Sidebar Dashboard" }),
  apis: z.array(z.object({
    endpoint: z.string(),
    method: z.string(),
    description: z.string()
  })).default([]),
  database: z.object({
    dialect: z.string().default("PostgreSQL"),
    ORM: z.string().default("Prisma")
  }).default({ dialect: "PostgreSQL", ORM: "Prisma" }),
  deployment: z.object({
    provider: z.string().default("Vercel"),
    environment: z.string().default("Production")
  }).default({ provider: "Vercel", environment: "Production" }),
  recommendations: z.array(z.object({
    recommendation: z.string(),
    why: z.string(),
    impact: z.string()
  })).default([]),
  assumptions: z.array(z.string()).default([]),
  openQuestions: z.array(z.string()).default([]),
  estimatedComplexity: z.string().default("MEDIUM"),
  buildStatus: z.string().default("READY_FOR_BUILD")
})

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId)
    let project: any = null
    try {
      project = await (db.project as any).findUnique({
        where: { id: params.projectId }
      })
    } catch {}

    const blueprintData = project?.blueprintData || (access.project as any)?.blueprintData || null

    return NextResponse.json({
      lifecycle: project?.lifecycle || (access.project as any)?.lifecycle || "BLUEPRINT",
      blueprint: blueprintData
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const context = await buildProjectContext(params.projectId)

    const systemPrompt = `You are the Lead Solutions Architect. Generate a Master Architectural Blueprint for the user's business transformation project.`
    const userPrompt = `Based on the following project context, generate a complete 26-section Master Blueprint:\n\n${context}`

    const aiResult = await generateStructured({
      task: "MASTER_BLUEPRINT",
      system: systemPrompt,
      user: userPrompt,
      schema: BlueprintSchema,
      language: access.project.language,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId
    })

    if (!aiResult.ok) {
      return NextResponse.json({ error: aiResult.error.message }, { status: 500 })
    }

    const blueprint = aiResult.data.data

    try {
      await (db.project as any).update({
        where: { id: params.projectId },
        data: {
          lifecycle: "BLUEPRINT",
          blueprintData: blueprint
        }
      })
      await db.activityLog.create({
        data: {
          organizationId: access.project.workspace.organizationId,
          projectId: params.projectId,
          actorId: access.user.id,
          action: "GENERATE_BLUEPRINT",
          entity: "Project",
          entityId: params.projectId
        }
      })
    } catch (dbErr) {
      console.warn("DB update skipped for demo or in-memory project:", dbErr)
    }

    return NextResponse.json({
      lifecycle: "BLUEPRINT",
      blueprint
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json()

    const parse = BlueprintSchema.safeParse(body.blueprint)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.format() }, { status: 400 })
    }

    try {
      await (db.project as any).update({
        where: { id: params.projectId },
        data: {
          blueprintData: parse.data
        }
      })
    } catch (dbErr) {
      console.warn("DB update skipped for demo or in-memory project:", dbErr)
    }

    const affectedDeliverables = [
      "REQUIREMENTS",
      "SYSTEM_SPEC",
      "SOLUTION_RECOMMENDATION",
      "DATABASE_DESIGN",
      "API_DESIGN",
      "TRANSFORMATION_ROADMAP",
      "PROCESS_ANALYSIS"
    ]

    return NextResponse.json({
      lifecycle: "BLUEPRINT",
      blueprint: parse.data,
      affectedDeliverablesCount: affectedDeliverables.length,
      affectedDeliverables
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
