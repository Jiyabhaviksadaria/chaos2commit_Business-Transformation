import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { parseExternalUrl } from "@/lib/ssrf"

const ProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  templateId: z.string().trim().min(1).optional().default("clinic"),
  industry: z.string().trim().max(120).optional(),
  businessGoal: z.string().trim().max(20_000).optional(),
  language: z.string().trim().min(2).max(12).default("en"),
  businessContext: z.string().trim().max(50_000).optional(),
  intakeUrl: z.string().trim().max(2_048).optional(),
  hasDocument: z.boolean().optional(),
  mode: z.enum(["analyze", "build"]).optional(),
})

export async function GET() {
  try {
    const user = await requireUser()
    const orgId = user.organizationId

    if (!orgId) {
       return NextResponse.json({ error: "No organization associated" }, { status: 400 })
    }

    const projects = await db.project.findMany({
      where: {
        workspace: {
          organizationId: orgId
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(projects)
  } catch (err: unknown) {
    const status = err instanceof Error && err.name === "AuthError" ? 401 : 503
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to load projects." }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const orgId = user.organizationId
    if (!orgId) return NextResponse.json({ error: "No organization associated with this account." }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const parse = ProjectInputSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 })
    }

    const { templateId, industry, language, businessContext, intakeUrl, hasDocument, mode } = parse.data
    if (mode === "analyze" && !intakeUrl && !hasDocument) {
      return NextResponse.json({ error: "Please provide a website URL or upload a document." }, { status: 400 })
    }
    let normalizedUrl: string | undefined
    if (intakeUrl) {
      try {
        normalizedUrl = parseExternalUrl(intakeUrl).toString()
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid website URL." }, { status: 400 })
      }
    }
    const explicitTemplate = typeof body.templateId === "string" && body.templateId.trim().length > 0
    const isWebsiteBuild = mode === "build" || (mode !== "analyze" && !intakeUrl && explicitTemplate) || (mode !== "analyze" && !intakeUrl && (parse.data.businessGoal || "").toLowerCase().startsWith("build website"))
    const name = parse.data.name || (normalizedUrl ? (() => { try { return new URL(normalizedUrl).hostname.replace(/^www\./i, "") } catch { return "Website Transformation Project" } })() : "Source-based Transformation Project")
    const businessGoal = parse.data.businessGoal || (normalizedUrl ? `Analyze the business information published at ${normalizedUrl}.` : "Analyze the uploaded business document(s).")
    const spec = isWebsiteBuild && templateId ? buildWebsiteSpecFromTemplate(templateId, name) : null

    try {
      let firstWorkspace = await db.workspace.findFirst({
        where: { organizationId: orgId }
      })

      if (!firstWorkspace) {
        let org = await db.organization.findUnique({ where: { id: orgId } })
        if (!org) {
          org = await db.organization.create({
            data: { id: orgId, name: "Default Organization", slug: `org-${Date.now()}` }
          })
        }
        firstWorkspace = await db.workspace.create({
          data: {
            organizationId: org.id,
            name: "Default Workspace"
          }
        })
      }

      const project = await db.project.create({
        data: {
          workspaceId: firstWorkspace.id,
          name,
          industry: industry || "General Business",
          businessGoal,
          language: language || "en",
          businessContext,
          intakeUrl: normalizedUrl || null,
          projectContext: {
            create: {
              extractedText: "",
              businessContent: "",
              metadata: {
                userContext: {
                  name: user.name || "Unknown user",
                  companyRole: user.companyRole || "Not specified",
                },
              },
            },
          }
        }
      })

      let deliverable = null
      if (spec && templateId) {
        // Preserve the existing Website Builder baseline only for its explicit
        // build/template flow. Analysis projects do not receive website data.
        deliverable = await db.deliverable.create({
          data: {
            projectId: project.id,
            type: "WEBSITE_SPEC",
            title: "Master Application Website Spec",
            status: "APPROVED"
          }
        })
        const version = await db.deliverableVersion.create({
          data: {
            deliverableId: deliverable.id,
            versionNumber: 1,
            content: spec as Prisma.InputJsonValue,
            source: "USER_EDIT",
            language: language || "en",
            note: `Initial project template baseline (${templateId})`
          }
        })
        await db.deliverable.update({ where: { id: deliverable.id }, data: { currentVersionId: version.id } })
      }

      return NextResponse.json({ project, deliverable, spec })
    } catch (dbErr) {
      console.error("Project persistence failed:", dbErr)
      return NextResponse.json({ error: "Unable to persist the project. Check the database connection and try again." }, { status: 503 })
    }
  } catch (err: unknown) {
    const status = err instanceof Error && err.name === "AuthError" ? 401 : 503
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Error" }, { status })
  }
}
