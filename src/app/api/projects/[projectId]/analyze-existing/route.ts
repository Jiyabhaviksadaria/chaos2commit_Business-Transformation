import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

const ExistingSystemSchema = z.object({
  repoUrl: z.string().url().max(2_048).optional(),
  techStack: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  description: z.string().trim().max(20_000).optional(),
})

function scoreFromEvidence(text: string): number {
  const signals = [
    /legacy|monolith|coupled|technical debt/i,
    /java\s*(8|11)|struts|legacy framework/i,
    /oracle|mysql|sql server|schema/i,
    /manual|spreadsheet|email|phone|paper/i,
    /api|integration|interface/i,
  ]
  return Math.min(95, 30 + signals.filter((signal) => signal.test(text)).length * 12)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const parsed = ExistingSystemSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { repoUrl, techStack = [], description = "" } = parsed.data
    const evidence = [repoUrl || "", ...techStack, description].filter(Boolean).join("\n")
    const technicalDebtScore = scoreFromEvidence(evidence)
    const recommendations: Array<{ area: string; action: string; urgency: "HIGH" | "MEDIUM" | "LOW"; evidence: string }> = []

    if (/monolith|coupled|legacy/i.test(evidence)) recommendations.push({ area: "Application boundaries", action: "Map current domains and define a migration path toward modular boundaries.", urgency: "HIGH", evidence: "The supplied description or stack identifies a monolithic or legacy application." })
    if (/oracle|mysql|sql server|database|schema/i.test(evidence)) recommendations.push({ area: "Data platform", action: "Inventory schemas, ownership, data quality constraints, and migration dependencies.", urgency: "HIGH", evidence: techStack.join(", ") || "A database technology was supplied." })
    if (/api|integration|interface/i.test(evidence)) recommendations.push({ area: "Interfaces", action: "Document current interfaces and define versioned contracts before migration.", urgency: "MEDIUM", evidence: "The supplied evidence mentions APIs or integrations." })
    if (/manual|spreadsheet|email|phone|paper/i.test(evidence)) recommendations.push({ area: "Process automation", action: "Prioritize manual handoffs with the highest volume and clearest measurable outcome.", urgency: "MEDIUM", evidence: "The supplied evidence describes a manual workflow." })
    if (recommendations.length === 0) recommendations.push({ area: "Discovery baseline", action: "Collect architecture, data, integration, and operational evidence before selecting a modernization approach.", urgency: "LOW", evidence: "No specific technical debt signals were present in the supplied input." })

    const analysisResult = {
      projectId: params.projectId,
      sourceUrl: repoUrl || null,
      detectedTechStack: techStack,
      description: description || null,
      technicalDebtScore,
      modernizationReadiness: `${100 - technicalDebtScore}%`,
      recommendations,
      analyzedAt: new Date().toISOString(),
    }

    await db.activityLog.create({
      data: {
        organizationId: access.project.workspace.organizationId,
        projectId: params.projectId,
        actorId: access.user.id,
        action: "legacy_app_analyzed",
        entity: "ModernizationAnalysis",
        entityId: params.projectId,
        metadata: { technicalDebtScore },
      },
    })

    return NextResponse.json({ ok: true, analysis: analysisResult, message: "Existing application evidence analyzed." })
  } catch (error) {
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to analyze the existing application." }, { status })
  }
}
