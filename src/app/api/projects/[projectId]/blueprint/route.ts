import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext } from "@/lib/ai/context"
import { z } from "zod"

const BlueprintSchema = z.object({
  productOverview: z.string().min(1),
  businessObjective: z.string().min(1),
  productObjective: z.string().min(1),
  targetUsers: z.array(z.string()),
  userRoles: z.array(z.object({
    role: z.string(),
    description: z.string(),
    permissions: z.array(z.string())
  })),
  userJourneys: z.array(z.object({
    title: z.string(),
    steps: z.array(z.string())
  })),
  modules: z.array(z.object({
    key: z.string(),
    name: z.string(),
    description: z.string()
  })),
  features: z.array(z.object({
    key: z.string(),
    title: z.string(),
    moduleKey: z.string(),
    priority: z.string()
  })),
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
      confidence: z.number().min(0).max(1)
    }).optional()
  })),
  nonFunctionalRequirements: z.array(z.object({
    category: z.string(),
    description: z.string()
  })),
  businessRules: z.array(z.object({
    ruleId: z.string(),
    title: z.string(),
    rule: z.string()
  })),
  workflows: z.array(z.object({
    name: z.string(),
    trigger: z.string(),
    steps: z.array(z.string())
  })),
  integrations: z.array(z.object({
    name: z.string(),
    type: z.string(),
    details: z.string()
  })),
  aiFeatures: z.array(z.object({
    name: z.string(),
    description: z.string(),
    model: z.string()
  })),
  dataEntities: z.array(z.object({
    name: z.string(),
    fields: z.array(z.string())
  })),
  security: z.object({
    auth: z.string(),
    rbac: z.boolean(),
    compliance: z.array(z.string())
  }),
  architecture: z.object({
    type: z.string(),
    stack: z.array(z.string())
  }),
  ux: z.object({
    theme: z.string(),
    layout: z.string()
  }),
  apis: z.array(z.object({
    endpoint: z.string(),
    method: z.string(),
    description: z.string()
  })),
  database: z.object({
    dialect: z.string(),
    ORM: z.string()
  }),
  deployment: z.object({
    provider: z.string(),
    environment: z.string()
  }),
  recommendations: z.array(z.object({
    recommendation: z.string(),
    why: z.string(),
    impact: z.string()
  })),
  assumptions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  estimatedComplexity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  buildStatus: z.string()
})

function statusForError(error: unknown, fallback: number): number {
  if (error instanceof Error && error.name === "AuthError") return 401
  if (error instanceof Error && error.name === "AccessError") return 403
  return fallback
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId)
    const project = await db.project.findUnique({
      where: { id: params.projectId },
      select: { blueprintData: true, lifecycle: true },
    })
    return NextResponse.json({
      lifecycle: project?.lifecycle || access.project.lifecycle || "IDEA",
      blueprint: project?.blueprintData || access.project.blueprintData || null,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the blueprint." }, { status: statusForError(error, 503) })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const context = await buildProjectContext(params.projectId)
    const systemPrompt = `You are the Lead Solutions Architect. Generate a complete, evidence-backed Master Architectural Blueprint for the user's business transformation project. Return every field in the supplied JSON schema. Use only facts in the canonical Project Context; label assumptions and open questions instead of inventing evidence. Express explainability confidence as a number from 0 to 1.`
    const userPrompt = `Based on the following canonical Project Context, generate a complete Master Blueprint:\n\n${context}`

    const aiResult = await generateStructured({
      task: "MASTER_BLUEPRINT",
      system: systemPrompt,
      user: userPrompt,
      schema: BlueprintSchema,
      language: access.project.language || "en",
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })

    if (!aiResult.ok) return NextResponse.json({ error: aiResult.error.message }, { status: 502 })

    const blueprint = aiResult.data.data
    const persisted = await db.project.update({
      where: { id: params.projectId },
      data: { lifecycle: "BLUEPRINT", blueprintData: blueprint as Prisma.InputJsonValue },
    })
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "GENERATE_BLUEPRINT",
        entity: "Project",
        entityId: params.projectId,
      },
    })

    return NextResponse.json({ lifecycle: persisted.lifecycle, blueprint })
  } catch (error) {
    console.error("Blueprint generation failed:", error)
    return NextResponse.json({ error: "Unable to generate and persist the blueprint." }, { status: statusForError(error, 503) })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const body = await req.json().catch(() => ({}))
    const parsed = BlueprintSchema.safeParse(body.blueprint)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const updated = await db.project.update({
      where: { id: params.projectId },
      data: { blueprintData: parsed.data as Prisma.InputJsonValue },
    })
    const affectedDeliverables = [
      "REQUIREMENTS",
      "SOLUTION_RECOMMENDATION",
      "ARCHITECTURE_HLD",
      "PROCESS_MAP",
      "WIREFRAMES",
      "DATABASE_DESIGN",
      "API_DESIGN",
      "ESTIMATION",
      "ROADMAP",
    ]
    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "UPDATE_BLUEPRINT",
        entity: "Project",
        entityId: params.projectId,
        metadata: { affectedDeliverables },
      },
    })
    return NextResponse.json({ lifecycle: updated.lifecycle, blueprint: updated.blueprintData, affectedDeliverablesCount: affectedDeliverables.length, affectedDeliverables })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save the blueprint." }, { status: statusForError(error, 503) })
  }
}
