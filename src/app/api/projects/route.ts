import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { z } from "zod"

const ProjectInputSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  businessGoal: z.string().min(1),
  language: z.string().default("en"),
  businessContext: z.string().optional()
})

export async function GET() {
  try {
    const user = await requireUser()
    const orgId = user.organizationId

    if (!orgId) {
       return NextResponse.json({ error: "No organization associated" }, { status: 400 })
    }

    try {
      const projects = await db.project.findMany({
        where: {
          workspace: {
            organizationId: orgId
          }
        },
        orderBy: { createdAt: "desc" }
      })

      return NextResponse.json(projects)
    } catch (dbErr) {
      console.warn("Database offline, returning fallback demo project list:", dbErr)
      return NextResponse.json([
        {
          id: "demo-project-1",
          workspaceId: "demo-workspace",
          name: "Retail Chain Digital Transformation",
          industry: "Retail",
          businessGoal: "Modernize legacy in-store POS and inventory management systems.",
          status: "ACTIVE",
          language: "en",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "demo-project-2",
          workspaceId: "demo-workspace",
          name: "HR Consultancy & CRM Platform",
          industry: "Human Resources",
          businessGoal: "Build company website, CRM, attendance system, and client onboarding.",
          status: "ACTIVE",
          language: "en",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const orgId = user.organizationId

    if (!orgId) {
       return NextResponse.json({ error: "No organization associated" }, { status: 400 })
    }

    const firstWorkspace = await db.workspace.findFirst({
      where: { organizationId: orgId }
    })

    if (!firstWorkspace) {
      return NextResponse.json({ error: "No workspace found in organization" }, { status: 400 })
    }

    const body = await req.json()
    const parse = ProjectInputSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        workspaceId: firstWorkspace.id,
        name: parse.data.name,
        industry: parse.data.industry,
        businessGoal: parse.data.businessGoal,
        language: parse.data.language,
        businessContext: parse.data.businessContext
      }
    })

    return NextResponse.json(project)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status: 500 })
  }
}
