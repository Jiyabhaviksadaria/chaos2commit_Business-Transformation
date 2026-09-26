"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, CircleHelp, Lightbulb, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { DiscoveryQuestion, DiscoveryState, DiscoveryUnderstanding } from "@/lib/ai/discovery"

interface DiscoveryLoopProps { projectId: string; language?: string | null; onScoreUpdate?: () => void }

function statusLabel(status: DiscoveryState["status"] | undefined): string {
  if (status === "READY_FOR_ANALYSIS") return "Enough evidence to analyze"
  if (status === "ANALYSIS_COMPLETE") return "Analysis generated"
  if (status === "IN_PROGRESS") return "Investigation in progress"
  return "Ready to investigate"
}

function UnderstandingSection({ title, values, tone = "neutral" }: { title: string; values: string[]; tone?: "neutral" | "confirmed" | "unknown" }) {
  if (!values.length) return null
  return <div className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{title}</p><div className="mt-2 space-y-1.5">{values.map((value, index) => <p key={`${value}-${index}`} className={`text-xs leading-relaxed ${tone === "confirmed" ? "text-emerald-800" : tone === "unknown" ? "text-amber-800" : "text-neutral-700"}`}>{value}</p>)}</div></div>
}

export function DiscoveryLoop({ projectId, language, onScoreUpdate }: DiscoveryLoopProps) {
  const router = useRouter()
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [discoveryState, setDiscoveryState] = useState<DiscoveryState | null>(null)
  const [understanding, setUnderstanding] = useState<DiscoveryUnderstanding | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualNote, setManualNote] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [degradedMode, setDegradedMode] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const initialDiscoveryStarted = useRef(false)

  const applyPayload = useCallback((payload: { questions?: DiscoveryQuestion[]; discoveryState?: DiscoveryState; understanding?: DiscoveryUnderstanding; degradedMode?: boolean; notice?: string }) => {
    if (Array.isArray(payload.questions)) setQuestions(payload.questions)
    if (payload.discoveryState) setDiscoveryState(payload.discoveryState)
    if (payload.understanding) setUnderstanding(payload.understanding)
    if (typeof payload.degradedMode === "boolean") setDegradedMode(payload.degradedMode)
    if (typeof payload.notice === "string") setNotice(payload.notice)
  }, [])

  const loadQuestions = useCallback(async (): Promise<DiscoveryQuestion[]> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/questions`)
      const payload = await response.json().catch(() => ({}))
      if (response.ok) {
        applyPayload(payload)
        return Array.isArray(payload.questions) ? payload.questions as DiscoveryQuestion[] : []
      }
      return []
    } catch {
      setError("INTELLY could not load the current investigation state.")
      return []
    }
  }, [applyPayload, projectId])

  const generate = useCallback(async (showToast = true) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/questions`, { method: "POST" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to generate the next investigation questions.")
      applyPayload(payload)
      if (showToast) toast.success("INTELLY selected the highest-value next questions.")
      return true
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : "Unable to generate the next investigation questions."
      setError(message)
      if (showToast) toast.error(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [applyPayload, projectId])

  useEffect(() => {
    if (initialDiscoveryStarted.current) return
    initialDiscoveryStarted.current = true
    void (async () => {
      const loadedQuestions = await loadQuestions()
      if (loadedQuestions.length === 0) await generate(false)
    })()
  }, [generate, loadQuestions])

  const submit = async () => {
    const payload = questions.filter((question) => answers[question.id]?.trim()).map((question) => ({ questionId: question.id, category: question.category, question: question.question, answer: answers[question.id].trim() }))
    if (!payload.length) {
      toast.error("Please answer at least one investigation question.")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to save the investigation answers.")
      setDiscoveryState(result.discoveryState || discoveryState)
      setUnderstanding(result.understanding || understanding)
      setQuestions((current) => current.filter((question) => !payload.some((answer) => answer.questionId === question.id)))
      setAnswers({})
      toast.success("Answer saved. INTELLY updated its understanding and selected follow-up questions.")
      onScoreUpdate?.()
      await generate(false)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to save the investigation answers."
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const saveManualNote = async () => {
    if (!manualNote.trim()) return
    setSavingNote(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: [{ questionId: "manual-context", category: "USER_CORRECTION", question: "Additional information or correction", answer: manualNote.trim() }] }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to save the additional context.")
      setManualNote("")
      setDiscoveryState(result.discoveryState || discoveryState)
      setUnderstanding(result.understanding || understanding)
      toast.success("Additional context saved. INTELLY will reassess the understanding.")
      await generate(false)
    } catch (noteError) {
      const message = noteError instanceof Error ? noteError.message : "Unable to save the additional context."
      setError(message)
      toast.error(message)
    } finally {
      setSavingNote(false)
    }
  }

  const generateAnalysis = async () => {
    setGeneratingAnalysis(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "INTAKE_ANALYSIS", language: language || "en" }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.info("Navigating to Business Analysis board.")
        router.push(`/projects/${projectId}/business-analysis`)
        return
      }
      toast.success("Business analysis generated from the discovered evidence.")
      router.push(`/projects/${projectId}/business-analysis`)
    } catch {
      router.push(`/projects/${projectId}/business-analysis`)
    } finally {
      setGeneratingAnalysis(false)
    }
  }

  const confirmedFacts = understanding?.confirmedFacts?.map((fact) => `${fact.statement} [${fact.status}]`) || []
  const currentProcess = understanding?.currentProcess || []
  const observedProblems = understanding?.observedProblems?.map((problem) => `${problem.title}: ${problem.description || "Needs validation"} [${problem.status}]`) || []
  const rootCauses = understanding?.potentialRootCauses?.map((cause) => cause.statement) || []
  const unknowns = understanding?.unknowns || []
  const constraints = understanding?.constraints || []
  const evidence = understanding?.evidence || []
  const contradictions = understanding?.contradictions || []
  const processBottlenecks = understanding?.processBottlenecks || []

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
      <CardHeader className="pb-4 border-b border-[#E5DFD4]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F472B6]" />
              INTELLY DISCOVERY
            </CardTitle>
            <CardDescription className="text-xs">
              Before recommending a solution, INTELLY investigates how your business actually works.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{statusLabel(discoveryState?.status)}</Badge>
            <Button
              variant="default"
              size="sm"
              onClick={() => generate()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CircleHelp className="w-3.5 h-3.5 text-[#FEE895]" />
              )}
              {questions.length ? "Refresh questions" : "Start investigation"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 flex items-center gap-2.5">
            <CircleHelp className="h-4 w-4 shrink-0 text-red-600" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={loadQuestions} className="text-xs font-bold text-red-900 hover:bg-red-100/60">
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="text-xs font-bold text-red-900 hover:bg-red-100/60">
              Continue manually
            </Button>
          </div>
        )}
        {degradedMode && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-center gap-2.5">
            <CircleHelp className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="flex-1">{notice || "AI provider unavailable. Showing baseline discovery questions."}</span>
            <Button variant="ghost" size="sm" onClick={() => generate(true)} className="text-xs font-bold text-amber-900 hover:bg-amber-100/60">
              Retry AI
            </Button>
          </div>
        )}

        {contradictions.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
              <CircleHelp className="w-4 h-4 text-amber-700" /> Potential Cross-Document Inconsistencies Detected
            </div>
            <p className="text-[11px] text-amber-800">
              The AI detected differing details across your business documents or context:
            </p>
            <div className="space-y-1.5 mt-1">
              {contradictions.map((c, i) => (
                <p key={i} className="text-xs text-amber-950 bg-white/80 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                  ⚠️ {c}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3.5">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Investigation progress</p>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full bg-[#18181C] transition-all rounded-full" style={{ width: `${discoveryState?.progress || 0}%` }} />
              </div>
              <span className="text-xs font-extrabold text-neutral-800">{discoveryState?.progress || 0}%</span>
            </div>
          </div>
          {discoveryState?.confidence !== undefined && (
            <Badge variant="accent">Confidence {discoveryState.confidence}%</Badge>
          )}
        </div>

        {(confirmedFacts.length > 0 || currentProcess.length > 0 || observedProblems.length > 0 || rootCauses.length > 0 || processBottlenecks.length > 0 || unknowns.length > 0 || constraints.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">INTELLY UNDERSTANDING</h3>
              <span className="text-[10px] text-neutral-500 font-medium">Only evidence-backed findings are shown</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <UnderstandingSection title="Confirmed facts" values={confirmedFacts} tone="confirmed" />
              <UnderstandingSection title="Current process" values={currentProcess} />
              <UnderstandingSection title="Observed problems" values={observedProblems} />
              <UnderstandingSection title="Potential root causes" values={rootCauses} tone="confirmed" />
              <UnderstandingSection title="Process bottlenecks & handoffs" values={processBottlenecks} tone="unknown" />
              <UnderstandingSection title="Unknown" values={unknowns} tone="unknown" />
              <UnderstandingSection title="Constraints" values={constraints} />
            </div>
            {evidence.length > 0 && (
              <div className="rounded-2xl border border-[#E5DFD4] bg-white p-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">Evidence collected ({evidence.length} items)</p>
                <div className="mt-2 space-y-1.5">
                  {evidence.map((item, index) => (
                    <p key={`${item.statement}-${index}`} className="text-xs text-neutral-700">
                      ✓ {item.statement} <span className="text-[10px] text-neutral-400 font-semibold">({item.source})</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(confirmedFacts.length > 0 || currentProcess.length > 0 || observedProblems.length > 0) && (
          <div className="rounded-2xl border border-[#E5DFD4] bg-white p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">WHAT I UNDERSTAND SO FAR</p>
                <p className="text-xs text-neutral-500 mt-0.5">Is this understanding correct before INTELLY continues?</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => generate(true)}>
                  Yes, Continue
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("discovery-questions")?.scrollIntoView({ behavior: "smooth" })}>
                  Correct Something
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("discovery-questions")?.scrollIntoView({ behavior: "smooth" })}>
                  Add Information
                </Button>
              </div>
            </div>
          </div>
        )}

        {discoveryState?.readyForAnalysis && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-emerald-900">INTELLY has enough information to analyze your transformation.</p>
              <p className="text-xs text-emerald-800 mt-1">The next step will generate an evidence-backed Business Analysis, not an automatic software recommendation.</p>
            </div>
            <Button variant="default" size="sm" onClick={generateAnalysis} disabled={generatingAnalysis} className="gap-2 shrink-0">
              {generatingAnalysis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              Generate Business Analysis
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-[#E5DFD4] bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <p className="text-xs font-extrabold text-neutral-900">Add information or correct something</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Use this when the current understanding is incomplete or incorrect.</p>
            </div>
            <Button type="button" variant="default" size="sm" onClick={saveManualNote} disabled={savingNote || !manualNote.trim()} className="gap-2">
              {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save information
            </Button>
          </div>
          <Textarea
            value={manualNote}
            onChange={(event) => setManualNote(event.target.value)}
            placeholder="Share a correction, missing fact, or business impact detail..."
            className="mt-3 min-h-20"
          />
        </div>

        {questions.length === 0 ? (
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-8 rounded-2xl text-center">
            <Lightbulb className="w-8 h-8 text-neutral-400 mx-auto" />
            <h4 className="text-sm font-extrabold text-neutral-900 mt-3">No open questions</h4>
            <p className="text-xs text-neutral-500 mt-1">Start the investigation or review the current understanding above.</p>
          </div>
        ) : (
          <div id="discovery-questions" className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="default">{question.category}</Badge>
                  <span className="text-[10px] font-bold text-neutral-400">
                    {question.priority} priority · {question.informationValue}% information value
                  </span>
                </div>
                <div>
                  <h5 className="text-sm font-extrabold text-neutral-900">{question.question}</h5>
                  <details className="mt-2 text-xs text-neutral-500">
                    <summary className="cursor-pointer font-semibold hover:text-neutral-800">Why is INTELLY asking this?</summary>
                    <p className="mt-1 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-[#E5DFD4]/60">
                      {question.rationale || question.whyItMatters || question.reason}
                    </p>
                  </details>
                </div>
                {question.suggestedAnswers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {question.suggestedAnswers.map((answer) => (
                      <button
                        type="button"
                        key={answer}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: answer }))}
                        className={`px-3 py-1 text-xs rounded-full border transition-all ${
                          answers[question.id] === answer
                            ? "bg-[#18181C] text-white border-neutral-900 shadow-xs"
                            : "bg-white border-[#E5DFD4] text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                )}
                <Textarea
                  value={answers[question.id] || ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                  placeholder="Type a specific, evidence-based answer..."
                  className="bg-white min-h-20"
                />
              </div>
            ))}
            <Button variant="default" size="default" onClick={submit} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Save answers and continue investigation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
