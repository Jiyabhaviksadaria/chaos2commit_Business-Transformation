"use client"

import React, { useCallback, useEffect, useState } from "react"
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Hammer, Loader2, Sparkles, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { IntakeAnalysisData } from "@/modules/deliverables/intake-analysis"

type AnswerMap = Record<string, string>

const downstreamStages = [
  { type: "REQUIREMENTS", label: "Requirements", icon: Zap },
  { type: "SOLUTION_RECOMMENDATION", label: "Solutions", icon: Sparkles },
  { type: "ARCHITECTURE_HLD", label: "Architecture", icon: CheckCircle2 },
  { type: "PROCESS_MAP", label: "Processes", icon: ArrowRight },
  { type: "WIREFRAMES", label: "UX", icon: Sparkles },
  { type: "DATABASE_DESIGN", label: "Database", icon: CheckCircle2 },
  { type: "API_DESIGN", label: "APIs", icon: ArrowRight },
  { type: "ROADMAP", label: "Roadmap", icon: Zap },
]

function list(values: unknown): string[] {
  return Array.isArray(values) ? values.map(String) : []
}

function Section({ title, values }: { title: string; values: unknown }) {
  const items = list(values)
  if (items.length === 0) return null
  return <div><h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{title}</h4><div className="flex flex-wrap gap-2">{items.map((item, index) => <Badge key={`${item}-${index}`} variant="outline" className="border-[#E5DFD4] text-[11px] text-neutral-700 whitespace-normal text-left">{item}</Badge>)}</div></div>
}

export function DiscoveryView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [analysis, setAnalysis] = useState<IntakeAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingAnswers, setSavingAnswers] = useState(false)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to load business analysis.")
      const versionId = payload?.currentVersionId || payload?.versions?.[0]?.id
      if (!versionId) { setAnalysis(null); return }
      const versionResponse = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS/versions/${versionId}`)
      const version = await versionResponse.json().catch(() => ({}))
      if (!versionResponse.ok) throw new Error(version.error || "Unable to load the persisted analysis.")
      const data = version.content as IntakeAnalysisData
      setAnalysis(data)
      const nextSelected: Record<string, boolean> = {}
      for (const recommendation of data.recommendedSystems || data.recommendedSolutions || []) nextSelected[recommendation.id] = recommendation.priority === "MUST"
      setSelected(nextSelected)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load business analysis.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  const generateAnalysis = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "INTAKE_ANALYSIS" }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Business analysis could not be generated.")
      toast.success("Business analysis generated from the project context.")
      await fetchAnalysis()
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : "Business analysis could not be generated."
      setError(message)
      toast.error(message)
    } finally { setGenerating(false) }
  }

  const questions = analysis?.clarifyingQuestions?.length ? analysis.clarifyingQuestions : (analysis?.missingInformation || [])
  const recommendations = analysis?.recommendedSystems || analysis?.recommendedSolutions || []

  const saveAnswers = async () => {
    const payload = questions.filter((question) => answers[question.id]?.trim()).map((question) => ({ questionId: question.id, category: "Analysis", question: question.question, answer: answers[question.id].trim() }))
    if (payload.length === 0) { toast.error("Please answer at least one clarifying question."); return }
    setSavingAnswers(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: payload }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to save answers.")
      toast.success("Answers saved to the canonical project context.")
      setAnswers({})
      // Re-run analysis so the persisted analysis reflects the new answers.
      await generateAnalysis()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save answers.")
    } finally { setSavingAnswers(false) }
  }

  const buildRuntime = async () => {
    const systemIds = Object.entries(selected).filter(([, value]) => value).map(([id]) => id)
    if (systemIds.length === 0) { toast.error("Select at least one recommended system."); return }
    setBuilding(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/build`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemIds }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.ok) throw new Error(payload.error || "System runtime generation failed.")
      toast.success("Workable system runtime generated.")
      router.push(`/projects/${projectId}/system`)
    } catch (buildError) {
      toast.error(buildError instanceof Error ? buildError.message : "System runtime generation failed.")
    } finally { setBuilding(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-xs text-neutral-500"><Loader2 className="w-6 h-6 animate-spin" /> Loading persisted business analysis...</div>

  return <div className="space-y-6">
    <Card className="border-[#E5DFD4] bg-[#FAF8F2] rounded-[24px]">
      <CardHeader className="pb-3"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">{analysis ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Zap className="w-5 h-5 text-neutral-700" />} Business Discovery</CardTitle><CardDescription className="text-xs mt-1">AI analysis is generated from the persisted URL/document context.</CardDescription></div><Button onClick={generateAnalysis} disabled={generating} variant="outline" className="border-[#E5DFD4] text-xs font-bold rounded-full gap-2">{generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#F472B6]" />} {analysis ? "Re-analyze" : "Analyze business"}</Button></div></CardHeader>
      {error && <CardContent><div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}<Button variant="ghost" size="sm" onClick={fetchAnalysis} className="ml-auto text-xs">Retry</Button></div></CardContent>}
      {analysis ? <CardContent className="space-y-4"><p className="text-sm leading-relaxed text-neutral-800">{analysis.businessSummary}</p><div className="flex flex-wrap gap-2"><Badge className="bg-[#FEE895] text-neutral-900 border-none font-bold">{analysis.industry}</Badge>{analysis.businessType && <Badge className="bg-[#F8B4D9] text-neutral-900 border-none font-bold">{analysis.businessType}</Badge>}{analysis.businessModel && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.businessModel}</Badge>}</div><Section title="Key entities" values={analysis.keyEntities || analysis.knownEntities} /><Section title="Current processes" values={analysis.currentBusinessProcesses} /><Section title="Explicit requirements" values={analysis.explicitRequirements} /><Section title="Implicit requirements" values={analysis.implicitRequirements} /><Section title="Business needs" values={analysis.businessNeeds} /><Section title="Digital opportunities" values={analysis.digitalOpportunities} /><Section title="Risks and gaps" values={analysis.risksAndGaps} /></CardContent> : <CardContent><div className="text-center py-6"><p className="text-xs text-neutral-500">No persisted analysis yet. Generate it after intake to continue.</p><Button onClick={generateAnalysis} disabled={generating} className="mt-4 bg-[#18181C] text-white rounded-full text-xs font-bold gap-2">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate business analysis</Button></div></CardContent>}
    </Card>

    {questions.length > 0 && <Card className="border-[#E5DFD4] bg-white rounded-[24px]"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Clarifying Questions</CardTitle><CardDescription className="text-xs">Answer the highest-impact missing information. Answers are persisted and included in the next analysis.</CardDescription></CardHeader><CardContent className="space-y-4">{questions.map((question) => <div key={question.id} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-4 space-y-3"><div><p className="text-xs font-bold text-neutral-900">{question.question}</p><p className="text-[11px] text-neutral-500 mt-1">{question.reason || question.whyItMatters}</p></div><div className="flex flex-wrap gap-2">{(question.suggestedAnswers || []).map((answer) => <button type="button" key={answer} onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: answer }))} className={`px-3 py-1 text-xs rounded-full border transition-colors ${answers[question.id] === answer ? "bg-[#18181C] text-white border-black" : "bg-white border-neutral-300 text-neutral-700"}`}>{answer}</button>)}</div><Input value={answers[question.id] || ""} onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))} placeholder="Type a specific answer..." className="bg-white border-[#E5DFD4] text-xs" /></div>)}<Button onClick={saveAnswers} disabled={savingAnswers} className="bg-[#18181C] text-white rounded-full text-xs font-bold gap-2">{savingAnswers ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save answers and update analysis</Button></CardContent></Card>}

    {analysis && <Card className="border-[#E5DFD4] bg-white rounded-[24px]"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Recommended Solutions</CardTitle><CardDescription className="text-xs">Recommendations include evidence and confidence. Website creation is intentionally excluded unless explicitly requested.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">{recommendations.map((recommendation) => <button type="button" key={recommendation.id} onClick={() => setSelected((prev) => ({ ...prev, [recommendation.id]: !prev[recommendation.id] }))} className={`text-left rounded-2xl border p-4 transition-all ${selected[recommendation.id] ? "border-black bg-[#FAF8F2] shadow-md" : "border-[#E5DFD4] bg-white hover:bg-[#FAF8F2]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold text-neutral-900">{recommendation.name}</p><p className="text-[11px] text-neutral-500 mt-1">{recommendation.description || recommendation.rationale || recommendation.whyRecommended}</p></div><div className="flex gap-1 shrink-0"><Badge className="bg-[#FEE895] text-neutral-900 border-none text-[10px]">{recommendation.priority}</Badge><Badge variant="outline" className="text-[10px]">{recommendation.confidence}%</Badge></div></div>{recommendation.evidence?.length > 0 && <p className="text-[10px] text-neutral-500 mt-3">Evidence: {recommendation.evidence.join(" · ")}</p>}</button>)}</CardContent><CardFooter className="pt-0"><Button onClick={buildRuntime} disabled={building || recommendations.length === 0} className="bg-[#18181C] text-white rounded-full text-xs font-bold gap-2">{building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} Build Workable System Runtime</Button><Button variant="outline" onClick={() => router.push(`/projects/${projectId}/system`)} className="ml-2 rounded-full text-xs font-bold gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Open runtime</Button></CardFooter></Card>}

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{downstreamStages.map((stage) => { const StageIcon = stage.icon; return <button type="button" key={stage.type} onClick={() => router.push(`/projects/${projectId}?tab=${stage.type === "SOLUTION_RECOMMENDATION" ? "solutions" : stage.type === "ARCHITECTURE_HLD" ? "architecture" : stage.type === "PROCESS_MAP" ? "processes" : stage.type === "WIREFRAMES" ? "ux" : stage.type === "DATABASE_DESIGN" ? "database" : stage.type === "API_DESIGN" ? "apis" : stage.type === "ROADMAP" ? "roadmap" : "requirements"}`)} className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[18px] p-3 text-left hover:border-neutral-400 transition-colors"><StageIcon className="w-4 h-4 text-neutral-700" /><p className="text-xs font-extrabold text-neutral-900 mt-2">{stage.label}</p><p className="text-[10px] text-neutral-500 mt-1">Open generated stage</p></button> })}</div>
  </div>
}
