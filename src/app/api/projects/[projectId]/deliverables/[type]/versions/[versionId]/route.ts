import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"
import { DeliverableType } from "@prisma/client"
import { generateMultilingualWebsite } from "@/lib/ai/groq-qwen"
import { buildProjectContext } from "@/lib/ai/context"

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; type: string; versionId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId)
    try {
      const version = await db.deliverableVersion.findFirst({
        where: {
          id: params.versionId,
          deliverable: { projectId: params.projectId }
        }
      })
      if (version) return NextResponse.json(version)
    } catch (dbErr) {
      console.warn("DB offline in version GET, returning fallback content:", dbErr)
    }

    // A missing website version is generated only through the dedicated Qwen
    // service; unrelated transformation stages never manufacture content.
    const delivType = params.type.toUpperCase() as DeliverableType
    if (delivType !== DeliverableType.WEBSITE_SPEC) {
      return NextResponse.json({ error: "Persisted deliverable version not found." }, { status: 404 })
    }
    const context = await buildProjectContext(params.projectId)
    const primaryLanguage = access.project.primaryLanguage || access.project.language || "en"
    const supportedLanguages = Array.from(new Set([primaryLanguage, ...(access.project.supportedLanguages || [])]))
    const websiteResult = await generateMultilingualWebsite({
      context,
      primaryLanguage,
      supportedLanguages,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })
    if (!websiteResult.ok) {
      return NextResponse.json({ error: websiteResult.error.message }, { status: websiteResult.error.code === "RATE_LIMITED" ? 429 : 503 })
    }

    return NextResponse.json({
      id: params.versionId,
      versionNumber: 1,
      content: websiteResult.data.data,
      source: "AI",
      createdAt: new Date().toISOString(),
      note: "Generated Qwen multilingual website specification"
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
