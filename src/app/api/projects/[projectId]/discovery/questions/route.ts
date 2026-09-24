import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext, getProjectContextSnapshot, updateProjectContextMetadata } from "@/lib/ai/context"
import { env } from "@/env"
import { z } from "zod"

export const runtime = "nodejs"

const QuestionSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  reason: z.string().default(""),
  whyItMatters: z.string().default(""),
  suggestedAnswers: z.array(z.string()).default([]),
})
const DiscoveryQuestionsSchema = z.object({ questions: z.array(QuestionSchema).max(6) })

function evidenceQuestions(context: string): Array<z.infer<typeof QuestionSchema>> {
  const lower = context.toLowerCase()
  const questions: Array<z.infer<typeof QuestionSchema>> = []
  const add = (id: string, category: string, question: string, reason: string, suggestedAnswers: string[]) => {
    if (questions.length < 6) questions.push({ id, category, question, reason, whyItMatters: reason, suggestedAnswers })
  }

  if (!/\b(user|customer|client|employee|staff|patient|role|actor)\b/.test(lower)) {
    add("q-users", "Users", "Which user groups must use the transformed system first?", "Role and permission boundaries determine the runtime modules and access model.", ["Internal staff", "Customers", "Partners", "Multiple groups"])
  }
  if (!/\b(integration|integrat|api|webhook|email|sms|payment|erp|crm)\b/.test(lower)) {
    add("q-integrations", "Integrations", "Which existing systems or external services must the new solution integrate with?", "Integration boundaries determine API contracts, data ownership, and rollout sequencing.", ["No integrations", "Email/CRM", "Accounting/ERP", "Multiple systems"])
  }
  if (!/\b(volume|throughput|scale|concurrent|daily|monthly|transaction|sla)\b/.test(lower)) {
    add("q-scale", "Scale", "What transaction volume, concurrency, and availability target should the solution support?", "Scale and service levels determine database sizing, queues, and deployment topology.", ["Small pilot", "Up to 1,000/day", "10,000+/day", "High availability"])
  }
  if (!/\b(security|privacy|compliance|gdpr|hipaa|rbac|authentication|audit)\b/.test(lower)) {
    add("q-security", "Security", "What data classifications, authentication, privacy, and compliance controls are required?", "Security constraints must be reflected in the data model, API authorization, and acceptance criteria.", ["Standard RBAC", "Sensitive personal data", "Regulated data", "Unknown — advise"])
  }
  if (!/\b(migration|legacy|import|existing data|historical)\b/.test(lower)) {
    add("q-migration", "Migration", "Is there existing data or a legacy workflow that must be migrated or preserved?", "Migration constraints affect cutover, data quality, reconciliation, and risk.", ["No migration", "Import historical data", "Parallel run", "Unknown — advise"])
  }
  if (!/\b(success|metric|kpi|measure|target|outcome)\b/.test(lower)) {
    add("q-outcomes", "Outcomes", "Which measurable business outcomes should the transformation deliver?", "Measurable outcomes make prioritization, roadmap sequencing, and acceptance testable.", ["Reduce manual work", "Improve response time", "Increase conversion", "Reduce operational cost"])
  }
  if (questions.length === 0) {
    add("q-constraints", "Scope", "What constraint or decision should the architecture team resolve first?", "A focused constraint helps the next stage produce a testable design.", ["Budget", "Timeline", "Compliance", "Team capability"])
  }
  return questions
}

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId)
    const context = await getProjectContextSnapshot(params.projectId)
    const questions = Array.isArray(context.metadata.discoveryQuestions) ? context.metadata.discoveryQuestions : []
    return NextResponse.json({ questions })
  } catch (error) {
    console.error("GET discovery questions failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to load discovery questions." }, { status })
  }
}

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const project = access.project
    const projectDelegate = (db as unknown as { project?: { findUnique?: unknown } }).project
    const context = typeof projectDelegate?.findUnique === "function"
      ? await buildProjectContext(params.projectId)
      : `${project.name}\n${project.businessGoal || ""}\n${project.businessContext || ""}`

    const aiResult = await generateStructured({
      task: "discovery_questions",
      system: "You are a Lead Enterprise Business Analyst. Generate no more than six high-value clarification questions based only on missing or ambiguous information in the canonical project context. Each question must include id, category, question, reason, whyItMatters, and suggestedAnswers. Do not ask random questions.",
      user: `PROJECT: ${project.name}\nCANONICAL PROJECT CONTEXT:\n${context}`,
      schema: DiscoveryQuestionsSchema,
      language: project.language && project.language !== "auto" ? project.language : "en",
      userId: access.user?.id,
      organizationId: project.workspace?.organizationId,
    })

    let questions: Array<z.infer<typeof QuestionSchema>>
    if (aiResult.ok) questions = aiResult.data.data.questions
    else if (env.AI_MOCK === "true") questions = evidenceQuestions(context)
    else return NextResponse.json({ error: "AI question generation is unavailable. Review the project context and try again." }, { status: 503 })

    questions = questions.slice(0, 6)
    const contextDelegate = (db as unknown as { projectContext?: unknown }).projectContext
    if (contextDelegate) await updateProjectContextMetadata(params.projectId, { discoveryQuestions: questions }).catch((error) => console.warn("Question context persistence failed:", error))
    return NextResponse.json({ questions })
  } catch (error) {
    console.error("POST discovery questions failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to generate discovery questions." }, { status })
  }
}
