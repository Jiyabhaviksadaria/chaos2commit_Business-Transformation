import { requireProjectAccess } from "@/lib/access"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { generateStructured } from "@/lib/ai/orchestrator"
import { buildProjectContext, getProjectContextSnapshot, updateProjectContextMetadata } from "@/lib/ai/context"
import { assessDiscoveryState, DiscoveryInterviewSchema, formatDiscoveryUnderstanding, mergeDiscoveryInterview, reconcileDiscoveryQuestions, type DiscoveryInterview, type DiscoveryQuestion, type DiscoveryState } from "@/lib/ai/discovery"

export const runtime = "nodejs"

function evidenceQuestions(context: string, state: DiscoveryState): DiscoveryQuestion[] {
  const lower = context.toLowerCase()
  const questions: DiscoveryQuestion[] = []
  const add = (id: string, category: string, question: string, reason: string, suggestedAnswers: string[], priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM") => {
    if (questions.length < 6) questions.push({ id, category, question, reason, whyItMatters: reason, rationale: reason, suggestedAnswers, priority, informationValue: priority === "HIGH" ? 90 : priority === "MEDIUM" ? 65 : 40, evidenceRefs: [], status: "OPEN" })
  }

  if (!state.understanding.currentProcess.length && !/\b(process|workflow|step|manual|currently)\b/.test(lower)) {
    add("q-process", "CURRENT PROCESS", "How does the affected process work from start to finish today?", "The current workflow is needed to distinguish a surface request from the underlying operational problem.", ["Describe the current steps", "It is not consistent", "I need help documenting it"], "HIGH")
  }
  if (!state.understanding.observedProblems.length && !/\b(problem|issue|error|slow|discrep|pain)\b/.test(lower)) {
    add("q-problem", "PAIN POINTS", "Where does work slow down, fail, or require repeated manual intervention?", "Observed symptoms help separate the requested solution from the problem that should be solved.", ["Manual data entry", "Errors or rework", "Delays or handoffs", "Customer impact"], "HIGH")
  }
  if (!state.understanding.businessImpact.length && !/\b(impact|cost|revenue|customer|lost|sales|discrep)\b/.test(lower)) {
    add("q-impact", "BUSINESS IMPACT", "What measurable business impact does this problem create?", "Impact determines whether a problem is a priority and which solution trade-offs matter.", ["Lost sales", "Employee time", "Customer dissatisfaction", "Financial loss", "Compliance risk"], "HIGH")
  }
  if (!state.understanding.constraints.length && !/\b(budget|timeline|compliance|privacy|constraint|legacy|team)\b/.test(lower)) {
    add("q-constraints", "CONSTRAINTS", "What constraints must the transformation respect?", "Constraints are necessary to avoid recommending an infeasible solution.", ["Budget", "Timeline", "Existing technology", "Compliance or privacy", "Team capability"], "MEDIUM")
  }
  if (state.understanding.potentialRootCauses.length && !/\b(api|integration|sync|manual|system|source|owner)\b/.test(lower)) {
    add("q-root-cause", "SYSTEMS & DATA", "Which system or data handoff is the likely source of this problem, and what evidence supports that?", "This tests a root-cause hypothesis before it becomes a solution recommendation.", ["Existing system boundary", "Manual handoff", "Unclear — needs investigation"], "HIGH")
  }
  if (questions.length === 0) {
    add("q-validation", "VALIDATION", "Is the current understanding correct, and what important detail would change it?", "User validation prevents the system from turning an unverified assumption into a downstream requirement.", ["Yes, continue", "Correct something", "Add information"], "HIGH")
  }
  return questions
}

function interviewFromQuestions(questions: DiscoveryQuestion[], state: DiscoveryState): DiscoveryInterview {
  return {
    questions,
    understanding: state.understanding,
    readyForAnalysis: state.readyForAnalysis,
    confidence: state.confidence,
    nextFocus: questions[0]?.rationale || "Validate the highest-impact unknown.",
  }
}

export async function GET(_req: Request, { params }: { params: { projectId: string } }) {
  try {
    await requireProjectAccess(params.projectId)
    const context = await getProjectContextSnapshot(params.projectId)
    const discovery = context.metadata.discovery && typeof context.metadata.discovery === "object" && !Array.isArray(context.metadata.discovery)
      ? context.metadata.discovery as DiscoveryState
      : assessDiscoveryState({ answers: context.answers, businessContent: context.businessContent, metadata: context.metadata, sourceCount: context.sources.length })
    const questions = reconcileDiscoveryQuestions(Array.isArray(context.metadata.discoveryQuestions) ? context.metadata.discoveryQuestions as DiscoveryQuestion[] : discovery.questions, context.answers)
    return NextResponse.json({ questions, discoveryState: discovery, understanding: discovery.understanding })
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
    const snapshot = await getProjectContextSnapshot(params.projectId)
    const state = assessDiscoveryState({ answers: snapshot.answers, businessContent: snapshot.businessContent, metadata: snapshot.metadata, sourceCount: snapshot.sources.length })
    const context = await buildProjectContext(params.projectId)
    const understanding = formatDiscoveryUnderstanding(state.understanding)
    const answerHistory = snapshot.answers.map((answer) => `Q: ${String(answer.question || "")}\nA: ${String(answer.answer || "")}`).join("\n\n")
    const aiResult = await generateStructured({
      task: "adaptive_discovery_interview",
      system: `You are INTELLY, an evidence-driven business transformation analyst. Conduct an adaptive discovery interview, not a generic questionnaire. Use only the supplied company context, source text, persisted answers, and confirmed understanding. Identify what is known, missing, contradictory, uncertain, or likely to change the current hypothesis. Ask no more than six questions, ordered by information value. Do not expose chain-of-thought. For each question provide a concise business rationale, not private reasoning. Distinguish confirmed facts, inferred hypotheses, assumptions, and unknowns. Mark readyForAnalysis only when objective, process, major problem, evidence, impact, and constraints are sufficiently evidenced. Never fabricate evidence or claim a source was analyzed if it is not in the context.`,
      user: `PROJECT: ${project.name}\nCOMPANY CONTEXT:\n${snapshot.businessContent}\nCURRENT UNDERSTANDING:\n${understanding || "No structured understanding yet."}\nPERSISTED ANSWERS:\n${answerHistory || "No answers yet."}\nCANONICAL PROJECT CONTEXT:\n${context}`,
      schema: DiscoveryInterviewSchema,
      language: project.language && project.language !== "auto" ? project.language : "en",
      userId: access.user?.id,
      organizationId: project.workspace?.organizationId,
      timeoutMs: 8_000,
    })

    let interview: DiscoveryInterview
    let degradedMode = false
    if (aiResult.ok) {
      interview = aiResult.data.data
    } else {
      // A provider outage must not leave the user on a blank screen. These are
      // baseline discovery prompts only, never fabricated conclusions or evidence.
      interview = interviewFromQuestions(evidenceQuestions(context, state), state)
      degradedMode = true
    }

    interview = { ...interview, questions: reconcileDiscoveryQuestions(interview.questions, snapshot.answers) }
    const nextState = mergeDiscoveryInterview(state, interview)
    const questions = nextState.questions.slice(0, 6)
    const contextDelegate = (db as unknown as { projectContext?: unknown }).projectContext
    if (contextDelegate) {
      await updateProjectContextMetadata(params.projectId, {
        discoveryQuestions: questions,
        discovery: nextState,
        intelligence: {
          ...(typeof snapshot.metadata.intelligence === "object" && !Array.isArray(snapshot.metadata.intelligence) ? snapshot.metadata.intelligence : {}),
          understanding: nextState.understanding,
          readyForAnalysis: nextState.readyForAnalysis,
          discoveryProgress: nextState.progress,
        },
      }).catch((error) => console.warn("Question context persistence failed:", error))
    }
    return NextResponse.json({ questions, discoveryState: nextState, understanding: nextState.understanding, readyForAnalysis: nextState.readyForAnalysis, degradedMode, notice: degradedMode ? "AI provider unavailable. Showing baseline discovery questions; no conclusions have been fabricated." : undefined })
  } catch (error) {
    console.error("POST discovery questions failed:", error)
    const status = error instanceof Error && error.name === "AuthError" ? 401 : error instanceof Error && error.name === "AccessError" ? 403 : 503
    return NextResponse.json({ error: "Unable to generate adaptive discovery questions." }, { status })
  }
}
