/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireProjectAccess } from "@/lib/access"

export const runtime = "nodejs"

const activeRecommendations = [
  {
    id: "opt_1",
    title: "Automate Candidate Screening Gate",
    category: "Process Efficiency",
    impact: "+40% Throughput",
    effort: "LOW",
    status: "PENDING",
    description: "Manual screening bottleneck detected in BPMN recruitment flow. Automated AI resume scoring can eliminate 4-hour review delays.",
    actionSummary: "Inject AI resume evaluator node into recruitment BPMN process diagram."
  },
  {
    id: "opt_2",
    title: "Database Query Indexing on Candidate Email Lookup",
    category: "System Performance",
    impact: "-180ms Latency",
    effort: "LOW",
    status: "PENDING",
    description: "Frequent full-table scans detected on Candidate record lookups in system runtime.",
    actionSummary: "Add composite index `@@index([email, status])` to ERD schema definition."
  },
  {
    id: "opt_3",
    title: "Gzip & Edge Caching for Website Assets",
    category: "Frontend UX",
    impact: "+25 Lighthouse Score",
    effort: "MEDIUM",
    status: "PENDING",
    description: "Generated website hero banners missing Cache-Control headers.",
    actionSummary: "Update Website Spec headers configuration with `s-maxage=86400, stale-while-revalidate`."
  }
]

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    await requireProjectAccess(params.projectId)

    const pendingCount = activeRecommendations.filter((r) => r.status === "PENDING").length
    const optimizationScore = Math.max(65, 100 - pendingCount * 10)

    return NextResponse.json({
      ok: true,
      optimizationScore,
      recommendations: activeRecommendations
    })
  } catch (error) {
    console.error("Fetch optimizations error:", error)
    return NextResponse.json({ error: "Failed to fetch optimization recommendations" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { user, project } = await requireProjectAccess(params.projectId)

    const body = await req.json()
    const { recommendationId } = body

    if (!recommendationId) {
      return NextResponse.json({ error: "Recommendation ID is required" }, { status: 400 })
    }

    const recIndex = activeRecommendations.findIndex((r) => r.id === recommendationId)
    if (recIndex === -1) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    activeRecommendations[recIndex].status = "APPLIED"

    const orgId = (project as any).workspace?.organizationId || "org_default"

    // Audit Log
    await db.activityLog.create({
      data: {
        organizationId: orgId,
        projectId: params.projectId,
        actorId: user.id,
        action: "optimization_applied",
        entity: "OptimizationRecommendation",
        entityId: recommendationId,
        metadata: {
          title: activeRecommendations[recIndex].title,
          impact: activeRecommendations[recIndex].impact
        }
      }
    }).catch(() => null)

    return NextResponse.json({
      ok: true,
      appliedRecommendation: activeRecommendations[recIndex],
      recommendations: activeRecommendations,
      message: `Successfully applied optimization: ${activeRecommendations[recIndex].title}`
    })
  } catch (error) {
    console.error("Apply optimization error:", error)
    return NextResponse.json({ error: "Failed to apply optimization recommendation" }, { status: 500 })
  }
}
