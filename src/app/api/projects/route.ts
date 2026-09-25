import { requireUser, requireOrgMember } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { parseExternalUrl } from "@/lib/ssrf"
import { companyContextSchema, normalizeCompanyContext } from "@/lib/company-context"

const ProjectInputSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  templateId: z.string().trim().min(1).optional().default("clinic"),
  industry: z.string().trim().max(120).optional(),
  businessGoal: z.string().trim().max(20_000).optional(),
  language: z.string().trim().min(2).max(12).default("en"),
  businessContext: z.string().trim().max(50_000).optional(),
  intakeUrl: z.string().trim().max(2_048).optional(),
  hasDocument: z.boolean().optional(),
  companyContext: companyContextSchema.optional(),
  mode: z.enum(["analyze", "build"]).optional(),
})

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const requestedOrgId = searchParams.get("organizationId")

    let orgId = requestedOrgId || user.organizationId

    if (requestedOrgId) {
      // Strictly enforce organization tenancy authorization:
      // A user cannot access another organization's projects simply by changing the ID in the request
      if (typeof requireOrgMember === "function") {
        await requireOrgMember(requestedOrgId)
      }
      orgId = requestedOrgId
    } else if (!orgId) {
      const firstMembership = typeof db.membership?.findFirst === "function"
        ? await db.membership.findFirst({
            where: { userId: user.id },
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
          })
        : null
      if (firstMembership) {
        orgId = firstMembership.organizationId
      }
    }

    if (!orgId) {
      return NextResponse.json({ error: "No organization associated" }, { status: 400 })
    }

    // Verify authorized membership in target organization
    if (typeof requireOrgMember === "function") {
      await requireOrgMember(orgId)
    }

    const projects = await db.project.findMany({
      where: {
        workspace: {
          organizationId: orgId,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(projects)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AccessError") {
      return NextResponse.json({ error: err.message }, { status: 403 })
    }
    const status = err instanceof Error && err.name === "AuthError" ? 401 : 503
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to load projects." }, { status })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    let orgId = user.organizationId
    if (!orgId) {
      const firstMembership = typeof db.membership?.findFirst === "function"
        ? await db.membership.findFirst({
            where: { userId: user.id },
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
          })
        : null
      if (firstMembership) {
        orgId = firstMembership.organizationId
      }
    }
    if (!orgId) return NextResponse.json({ error: "No organization associated with this account." }, { status: 400 })

    if (typeof requireOrgMember === "function") {
      await requireOrgMember(orgId, "project:create")
    }

    const body = await req.json().catch(() => ({}))
    const parse = ProjectInputSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.message }, { status: 400 })
    }

    const { templateId, language, businessContext, intakeUrl, hasDocument, mode } = parse.data
    const companyContext = parse.data.companyContext ? normalizeCompanyContext(parse.data.companyContext) : undefined
    const requestedUrl = intakeUrl || companyContext?.companyWebsite
    if (mode === "analyze" && !requestedUrl && !hasDocument && !companyContext) {
      return NextResponse.json({ error: "Please provide a website URL or upload a document." }, { status: 400 })
    }
    let normalizedUrl: string | undefined
    if (requestedUrl) {
      try {
        normalizedUrl = parseExternalUrl(requestedUrl).toString()
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid website URL." }, { status: 400 })
      }
    }
    const explicitTemplate = typeof body.templateId === "string" && body.templateId.trim().length > 0
    const isWebsiteBuild = mode === "build" || (mode !== "analyze" && !requestedUrl && explicitTemplate) || (mode !== "analyze" && !requestedUrl && (parse.data.businessGoal || "").toLowerCase().startsWith("build website"))
    const name = companyContext?.companyName || parse.data.name || (normalizedUrl ? (() => { try { return new URL(normalizedUrl).hostname.replace(/^www\./i, "") } catch { return "Website Transformation Project" } })() : "Source-based Transformation Project")
    const industry = companyContext?.industry || parse.data.industry
    const businessGoal = companyContext
      ? [companyContext.businessObjective, companyContext.objectiveClarification].filter(Boolean).join(" — ")
      : parse.data.businessGoal || (normalizedUrl ? `Analyze the business information published at ${normalizedUrl}.` : "Analyze the uploaded business document(s).")
    const spec = isWebsiteBuild && templateId ? buildWebsiteSpecFromTemplate(templateId, name) : null
    const storedCompanyContext = companyContext ? {
      ...companyContext,
      companyWebsite: companyContext.companyWebsite || "",
      objectiveClarification: companyContext.objectiveClarification || "",
    } : null

    try {
      let firstWorkspace = await db.workspace.findFirst({
        where: { organizationId: orgId }
      })

      if (!firstWorkspace) {
        const org = await db.organization.findUnique({ where: { id: orgId } })
        if (!org) {
          return NextResponse.json({ error: "Organization not found." }, { status: 404 })
        }
        firstWorkspace = await db.workspace.create({
          data: {
            organizationId: org.id,
            name: `${org.name} Workspace`,
            description: "Default workspace"
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
          businessContext: companyContext ? undefined : businessContext,
          intakeUrl: normalizedUrl || null,
          projectContext: {
            create: {
              extractedText: "",
              businessContent: "",
              metadata: {
                companyContext: storedCompanyContext,
                userContext: {
                  name: user.name || "Unknown user",
                  companyRole: user.companyRole || "Not specified",
                  intakeRole: companyContext?.userRole || null,
                  source: "SESSION",
                },
                discovery: {
                  status: "NOT_STARTED",
                  progress: 0,
                  readyForAnalysis: false,
                  questions: [],
                  understanding: {
                    confirmedFacts: [],
                    currentProcess: [],
                    observedProblems: [],
                    potentialRootCauses: [],
                    unknowns: [],
                    constraints: [],
                    evidence: [],
                  },
                  lastUpdatedAt: new Date().toISOString(),
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
