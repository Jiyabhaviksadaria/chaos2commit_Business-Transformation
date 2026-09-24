"use client"

import React, { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { IntakeAnalysisData } from "@/modules/deliverables/intake-analysis"

interface BusinessAnalysisViewProps { projectId: string; digitalMaturity?: number; aiReadiness?: number; discoveryCompleteness?: number; onScoreUpdate?: () => void; onOpenAi?: () => void }
interface GapData { title?: string; currentState?: unknown; targetState?: unknown; gaps?: unknown[]; recommendations?: unknown[] }

function values(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : [] }
function Chips({ title, value }: { title: string; value: unknown }) { const items = values(value); if (!items.length) return null; return <div><h4 className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{title}</h4><div className="flex flex-wrap gap-2">{items.map((item, i) => <Badge key={`${item}-${i}`} variant="outline" className="border-[#E5DFD4] text-[11px] text-neutral-700 whitespace-normal text-left">{item}</Badge>)}</div></div> }

export function BusinessAnalysisView({ projectId, digitalMaturity, aiReadiness, discoveryCompleteness, onScoreUpdate, onOpenAi }: BusinessAnalysisViewProps) {
  const [analysis, setAnalysis] = useState<IntakeAnalysisData | null>(null)
  const [gap, setGap] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState({ digitalMaturity, aiReadiness, discoveryCompleteness })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to load business analysis.")
      const versionId = payload?.currentVersionId || payload?.versions?.[0]?.id
      if (versionId) { const versionResponse = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS/versions/${versionId}`); const version = await versionResponse.json().catch(() => ({})); if (!versionResponse.ok) throw new Error(version.error || "Unable to load analysis version."); setAnalysis(version.content as IntakeAnalysisData) }
      const gapResponse = await fetch(`/api/projects/${projectId}/deliverables/GAP_ANALYSIS`)
      const gapPayload = await gapResponse.json().catch(() => ({}))
      const gapVersionId = gapPayload?.currentVersionId || gapPayload?.versions?.[0]?.id
      if (gapResponse.ok && gapVersionId) { const gapVersion = await fetch(`/api/projects/${projectId}/deliverables/GAP_ANALYSIS/versions/${gapVersionId}`); const gapData = await gapVersion.json().catch(() => ({})); if (gapVersion.ok) setGap(gapData.content as GapData) }
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load business analysis.") } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const recalculate = async () => {
    setRecalculating(true)
    try { const response = await fetch(`/api/projects/${projectId}/discovery/recalculate`, { method: "POST" }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Unable to recalculate scores."); setScores({ digitalMaturity: payload.digitalMaturity, aiReadiness: payload.aiReadiness, discoveryCompleteness: payload.discoveryCompleteness }); toast.success("Readiness scores updated from project context."); onScoreUpdate?.() } catch (recalcError) { toast.error(recalcError instanceof Error ? recalcError.message : "Unable to recalculate scores.") } finally { setRecalculating(false) }
  }

  const generateGap = async () => {
    try { const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "GAP_ANALYSIS" }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Unable to generate gap analysis."); toast.success("Gap analysis generated from the canonical context."); await load() } catch (generateError) { toast.error(generateError instanceof Error ? generateError.message : "Unable to generate gap analysis.") }
  }

  if (loading) return <div className="flex items-center justify-center h-64 gap-2 text-xs text-neutral-500"><Loader2 className="w-6 h-6 animate-spin" /> Loading persisted analysis...</div>

  const recommendations = analysis?.recommendedSystems || analysis?.recommendedSolutions || []
  const scoreText = (value: unknown) => typeof value === "number" && value > 0 ? `${value}%` : "Not assessed"
  return <div className="space-y-6">
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-xs text-red-800"><AlertCircle className="w-4 h-4" /> {error}<Button variant="ghost" size="sm" onClick={load} className="ml-auto">Retry</Button></div>}
    <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader className="pb-3 border-b border-[#E5DFD4]"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900">Business Analysis</CardTitle><CardDescription className="text-xs">Persisted analysis and readiness evidence for this project.</CardDescription></div><Button onClick={recalculate} disabled={recalculating} className="bg-[#18181C] text-white text-xs font-bold rounded-full gap-2">{recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculate readiness</Button></div></CardHeader><CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">{[["Digital Maturity", scores.digitalMaturity], ["AI & Cloud Readiness", scores.aiReadiness], ["Discovery Completeness", scores.discoveryCompleteness]].map(([label, value]) => <div key={String(label)} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl"><div className="flex justify-between text-xs font-extrabold text-neutral-900"><span>{label}</span><span>{scoreText(value)}</span></div><Progress value={typeof value === "number" ? value : 0} className="h-2 bg-neutral-200 mt-2" /></div>)}</CardContent></Card>

    {analysis ? <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Evidence-backed business profile</CardTitle><CardDescription className="text-xs">Generated from the canonical Project Context, not hardcoded demo content.</CardDescription></CardHeader><CardContent className="space-y-5"><p className="text-sm text-neutral-800 leading-relaxed">{analysis.businessSummary}</p><div className="flex flex-wrap gap-2"><Badge className="bg-[#FEE895] text-neutral-900 border-none">{analysis.industry}</Badge>{analysis.industryClassification && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.industryClassification}</Badge>}{analysis.businessType && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.businessType}</Badge>}{analysis.businessModel && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.businessModel}</Badge>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-5"><Chips title="Key entities" value={analysis.keyEntities || analysis.knownEntities} /><Chips title="Current business processes" value={analysis.currentBusinessProcesses} /><Chips title="Explicit requirements" value={analysis.explicitRequirements} /><Chips title="Implicit requirements" value={analysis.implicitRequirements} /><Chips title="Business needs" value={analysis.businessNeeds} /><Chips title="Digital opportunities" value={analysis.digitalOpportunities} /><Chips title="Risks and gaps" value={analysis.risksAndGaps} /></div><div><h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">Recommended solutions</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{recommendations.map((item) => <div key={item.id} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><div className="flex justify-between gap-2"><p className="text-xs font-extrabold text-neutral-900">{item.name}</p><span className="text-[10px] font-bold text-neutral-700">{item.priority} · {item.confidence}%</span></div><p className="text-[11px] text-neutral-600 mt-1">{item.description || item.rationale || item.whyRecommended}</p>{item.evidence?.length > 0 && <p className="text-[10px] text-neutral-500 mt-2">Evidence: {item.evidence.join(" · ")}</p>}</div>)}</div></div></CardContent></Card> : <Card className="border-dashed border-[#E5DFD4] bg-[#FAF8F2] rounded-[26px] p-10 text-center"><Sparkles className="w-8 h-8 text-neutral-400 mx-auto" /><h3 className="text-sm font-extrabold text-neutral-900 mt-3">No business analysis persisted</h3><p className="text-xs text-neutral-500 mt-1">Generate Business Analysis from the project context first.</p></Card>}

    <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base font-extrabold text-neutral-900">As-Is / To-Be Gap Analysis</CardTitle><CardDescription className="text-xs">Optional structured gap output generated from the same context.</CardDescription></div><Button variant="outline" onClick={generateGap} className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {gap ? "Regenerate" : "Generate"}</Button></CardHeader><CardContent>{gap ? <pre className="text-xs bg-[#18181C] text-neutral-200 rounded-2xl p-4 overflow-auto whitespace-pre-wrap">{JSON.stringify(gap, null, 2)}</pre> : <p className="text-xs text-neutral-500">No gap analysis has been generated.</p>}</CardContent></Card>
    {onOpenAi && <Button onClick={onOpenAi} variant="ghost" className="text-xs font-bold rounded-full gap-2"><Sparkles className="w-3.5 h-3.5 text-[#F472B6]" /> Ask the project-aware AI companion</Button>}
  </div>
}
