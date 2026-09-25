"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import type { IntakeAnalysisData } from "@/modules/deliverables/intake-analysis"
import { DemoBusinessAnalysisDashboard } from "@/components/projects/demo-business-analysis-dashboard"
import { AarohanDocumentUpload } from "@/components/projects/aarohan-document-upload"
import { normalizeOutputLanguage, type AarohanOutputLanguage, type AnalysisDataset } from "@/data/aarohan-business-analysis"

interface BusinessAnalysisViewProps { projectId: string; language?: string | null; digitalMaturity?: number; aiReadiness?: number; discoveryCompleteness?: number; onScoreUpdate?: () => void; onOpenAi?: () => void }
interface GapData { title?: string; currentState?: string; futureState?: string; gapItems?: Array<{ id?: string; area?: string; currentDeficiency?: string; desiredTarget?: string; gapSeverity?: string; recommendedAction?: string }>; stakeholderImpact?: Array<{ stakeholderGroup?: string; impactDescription?: string; readinessLevel?: string }>; digitalMaturityScore?: number; disclaimer?: string }
type RecordValue = Record<string, unknown>

function record(value: unknown): RecordValue {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}
}

function text(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return text(value) ? [text(value)] : []
  return value.map((item) => {
    if (typeof item === "string") return item
    const object = record(item)
    return text(object.title) || text(object.name) || text(object.statement) || text(object.description) || text(object.approach) || ""
  }).filter(Boolean)
}

function section(title: string, value: unknown, tone: "neutral" | "warning" = "neutral") {
  const items = list(value)
  if (!items.length) return null
  return <div className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-4"><h4 className={`text-[10px] font-extrabold uppercase tracking-wider ${tone === "warning" ? "text-amber-700" : "text-neutral-500"}`}>{title}</h4><div className="mt-2 space-y-1.5">{items.map((item, index) => <p key={`${item}-${index}`} className="text-xs leading-relaxed text-neutral-700">{item}</p>)}</div></div>
}

function scoreText(value: unknown): string {
  return typeof value === "number" && value > 0 ? `${value}%` : "Insufficient information"
}

function ReadinessCard({ readiness }: { readiness: unknown }) {
  const value = record(readiness)
  const dimensions = Array.isArray(value.dimensions) ? value.dimensions : []
  if (!dimensions.length) return null
  return <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Transformation Readiness</CardTitle><CardDescription className="text-xs">Scores are shown only when the corresponding evidence exists. Missing evidence remains visible.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">{dimensions.map((rawDimension) => { const dimension = record(rawDimension); const score = typeof dimension.score === "number" ? dimension.score : null; return <div key={text(dimension.key) || text(dimension.label)} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-extrabold text-neutral-900">{text(dimension.label) || text(dimension.key)}</p><Badge variant="outline" className="border-[#E5DFD4] text-[10px]">{score === null ? "Insufficient information" : `${score}%`}</Badge></div>{score !== null && <Progress value={score} className="h-2 mt-2 bg-neutral-200" />}<p className="text-[11px] text-neutral-600 mt-2">{text(dimension.explanation)}</p>{Array.isArray(dimension.evidence) && dimension.evidence.length > 0 && <p className="text-[10px] text-neutral-500 mt-2">Evidence: {dimension.evidence.map(String).join(" ┬╖ ")}</p>}{Array.isArray(dimension.missingInformation) && dimension.missingInformation.length > 0 && <p className="text-[10px] text-amber-700 mt-1">Missing: {dimension.missingInformation.map(String).join(" ┬╖ ")}</p>}</div>})}</CardContent></Card>
}

function DemoLoadingState() {
  return <div className="space-y-4" aria-live="polite"><div className="flex items-center justify-between"><div><div className="h-5 w-48 animate-pulse rounded bg-neutral-200" /><div className="mt-2 h-3 w-80 animate-pulse rounded bg-neutral-100" /></div><div className="h-10 w-36 animate-pulse rounded-full bg-neutral-200" /></div><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><div className="h-36 animate-pulse rounded-[24px] bg-neutral-100" /><div className="h-36 animate-pulse rounded-[24px] bg-neutral-100" /><div className="h-36 animate-pulse rounded-[24px] bg-neutral-100" /></div><div className="h-72 animate-pulse rounded-[26px] bg-neutral-100" /><div className="flex items-center justify-center gap-2 text-xs font-bold text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading illustrative business intelligenceΓÇª</div></div>
}

export function BusinessAnalysisView({ projectId, language, digitalMaturity, aiReadiness, discoveryCompleteness, onScoreUpdate, onOpenAi }: BusinessAnalysisViewProps) {
  const { data: session } = useSession()
  const [analysis, setAnalysis] = useState<IntakeAnalysisData | null>(null)
  const [gap, setGap] = useState<GapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scores, setScores] = useState({ digitalMaturity, aiReadiness, discoveryCompleteness })
  const [readiness, setReadiness] = useState<unknown>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  // Hackathon demo: recognized document + selected output language.
  const [aarohanAnalysis, setAarohanAnalysis] = useState<AnalysisDataset | null>(null)
  const [outputLanguage, setOutputLanguage] = useState<AarohanOutputLanguage>("en")

  // Restore the selected output language across a page refresh.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("intelly.aarohan.outputLanguage")
      if (stored) setOutputLanguage(normalizeOutputLanguage(stored))
    } catch {
      /* storage unavailable - default to English */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to load business analysis.")
      const versionId = payload?.currentVersionId || payload?.versions?.[0]?.id
      if (versionId) {
        const versionResponse = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS/versions/${versionId}`)
        const version = await versionResponse.json().catch(() => ({}))
        if (!versionResponse.ok) throw new Error(version.error || "Unable to load analysis version.")
        const data = version.content as IntakeAnalysisData
        setAnalysis(data)
        setReadiness(data.readiness || null)
      }
      const gapResponse = await fetch(`/api/projects/${projectId}/deliverables/GAP_ANALYSIS`)
      const gapPayload = await gapResponse.json().catch(() => ({}))
      const gapVersionId = gapPayload?.currentVersionId || gapPayload?.versions?.[0]?.id
      if (gapResponse.ok && gapVersionId) {
        const gapVersionResponse = await fetch(`/api/projects/${projectId}/deliverables/GAP_ANALYSIS/versions/${gapVersionId}`)
        const gapVersion = await gapVersionResponse.json().catch(() => ({}))
        if (gapVersionResponse.ok && gapVersion.content) setGap(gapVersion.content as GapData)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load business analysis.")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (session?.user?.isDemo) setIsDemoMode(true)
  }, [session?.user?.isDemo])

  const loadDemo = () => {
    if (isLoadingDemo) return
    setIsLoadingDemo(true)
    window.setTimeout(() => {
      setIsDemoMode(true)
      setIsLoadingDemo(false)
    }, 750)
  }

  const resetDemo = () => {
    setIsDemoMode(false)
    setIsLoadingDemo(false)
  }

  const generateAnalysis = async (instructions?: string) => {
    setGenerating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "INTAKE_ANALYSIS", instructions, language: language || "en" }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "INTELLY could not complete the business analysis.")
      toast.success(instructions ? "Challenge incorporated into the persisted analysis." : "Business analysis regenerated from the discovered evidence.")
      await load()
      onScoreUpdate?.()
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : "INTELLY could not complete the business analysis."
      setError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  const recalculate = async () => {
    setRecalculating(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/discovery/recalculate`, { method: "POST" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to recalculate readiness.")
      setScores({ digitalMaturity: payload.digitalMaturity, aiReadiness: payload.aiReadiness, discoveryCompleteness: payload.discoveryCompleteness })
      setReadiness(payload.readiness || null)
      toast.success("Readiness recalculated from persisted evidence.")
      onScoreUpdate?.()
    } catch (recalculateError) {
      toast.error(recalculateError instanceof Error ? recalculateError.message : "Unable to recalculate readiness.")
    } finally {
      setRecalculating(false)
    }
  }

  const generateGap = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "GAP_ANALYSIS" }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to generate gap analysis.")
      toast.success("Gap analysis generated from the canonical context.")
      await load()
    } catch (generateError) {
      toast.error(generateError instanceof Error ? generateError.message : "Unable to generate gap analysis.")
    }
  }

  const challenge = async () => {
    const challengeText = window.prompt("What should INTELLY challenge or reconsider?")
    if (!challengeText?.trim()) return
    await generateAnalysis(`Challenge the current analysis using this user question: ${challengeText.trim()}. Re-evaluate assumptions, alternatives, risks, and missing evidence. Persist any changed conclusions.`)
  }

  const recommendations = analysis?.recommendedSystems || analysis?.recommendedSolutions || []
  const solutionOptions = analysis?.solutionOptions || []
  const problemMap = analysis?.problemMap
  const selectedNodeData = useMemo(() => problemMap?.nodes?.find((node) => node.id === selectedNode), [problemMap, selectedNode])
  const evidence = analysis?.evidence || []
  const companyContext = analysis?.companyContext
  const companyContextItems = companyContext ? Object.entries(companyContext).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`) : []

  if (isLoadingDemo) return <DemoLoadingState />
  if (isDemoMode) return <DemoBusinessAnalysisDashboard onReset={resetDemo} />
  if (loading) return <div className="space-y-6"><div className="flex justify-end"><Button onClick={loadDemo} className="bg-[#18181C] text-white text-xs font-bold rounded-full gap-2"><Sparkles className="w-3.5 h-3.5" /> Load Demo Data</Button></div><DemoLoadingState /></div>

  return <div className="space-y-6">
    <AarohanDocumentUpload projectId={projectId} outputLanguage={outputLanguage} onOutputLanguageChange={setOutputLanguage} onAnalysisReady={setAarohanAnalysis} />
    {aarohanAnalysis && <DemoBusinessAnalysisDashboard onReset={() => setAarohanAnalysis(null)} dataset={aarohanAnalysis} />}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center gap-2 text-xs text-red-800"><AlertCircle className="w-4 h-4" /> {error}<Button variant="ghost" size="sm" onClick={load} className="ml-auto">Retry</Button><Button variant="ghost" size="sm" onClick={() => setError(null)}>Continue manually</Button></div>}
    <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader className="pb-3 border-b border-[#E5DFD4]"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900">Business Analysis</CardTitle><CardDescription className="text-xs">Evidence-backed understanding of the business before transformation design.</CardDescription></div><div className="flex flex-wrap gap-2"><Button onClick={loadDemo} className="bg-[#18181C] text-white text-xs font-bold rounded-full gap-2"><Sparkles className="w-3.5 h-3.5" /> Load Demo Data</Button><Button onClick={() => generateAnalysis()} disabled={generating} variant="outline" className="border-[#E5DFD4] text-xs font-bold rounded-full gap-2">{generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {analysis ? "Re-analyze" : "Generate analysis"}</Button><Button onClick={recalculate} disabled={recalculating} className="bg-[#18181C] text-white text-xs font-bold rounded-full gap-2">{recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculate readiness</Button></div></div></CardHeader><CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">{[["Digital Maturity", scores.digitalMaturity], ["AI & Cloud Readiness", scores.aiReadiness], ["Discovery Completeness", scores.discoveryCompleteness]].map(([label, value]) => <div key={String(label)} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl"><div className="flex justify-between text-xs font-extrabold text-neutral-900"><span>{label}</span><span>{scoreText(value)}</span></div><Progress value={typeof value === "number" ? value : 0} className="h-2 bg-neutral-200 mt-2" /></div>)}</CardContent></Card>

    {analysis ? <>
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Executive understanding</CardTitle><CardDescription className="text-xs">Conclusions are separated into confirmed, inferred, assumed, and unknown information.</CardDescription></CardHeader><CardContent className="space-y-5"><p className="text-sm text-neutral-800 leading-relaxed">{analysis.executiveSummary || analysis.businessSummary}</p><div className="flex flex-wrap gap-2"><Badge className="bg-[#FEE895] text-neutral-900 border-none">{analysis.industry}</Badge>{analysis.businessType && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.businessType}</Badge>}{analysis.businessModel && <Badge variant="outline" className="border-[#E5DFD4]">{analysis.businessModel}</Badge>}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{section("Company context", companyContextItems)}{section("Current state", analysis.currentState)}{section("Current workflow", analysis.currentWorkflow || analysis.currentBusinessProcesses)}{section("Business impact", analysis.businessImpact)}{section("Transformation opportunities", analysis.transformationOpportunities || analysis.digitalOpportunities)}{section("Assumptions", analysis.assumptions, "warning")}{section("Unknowns", analysis.unknowns, "warning")}{section("Constraints", analysis.constraints, "warning")}{section("Risks", analysis.risks, "warning")}</div></CardContent></Card>

      <ReadinessCard readiness={readiness || analysis.readiness} />

      {analysis.contradictions && analysis.contradictions.length > 0 && (
        <Card className="bg-amber-50 border-amber-300 rounded-[24px] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Cross-Document Contradictions Detected
            </CardTitle>
            <CardDescription className="text-xs text-amber-800">
              Discrepancies identified across supporting business documents or company inputs:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.contradictions.map((item, idx) => (
              <div key={idx} className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-950">
                ΓÜá∩╕Å {item}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.evidenceCoverage && (
        <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-extrabold text-neutral-900">
                Evidence Coverage & Portfolio Confidence
              </CardTitle>
              <Badge className="bg-[#FEE895] text-neutral-900 border-none font-bold text-[10px]">
                {analysis.evidenceCoverage.coveragePercentage}% Coverage
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-neutral-700">
            <p>
              <strong>{analysis.evidenceCoverage.readyDocuments}</strong> of{" "}
              <strong>{analysis.evidenceCoverage.totalDocuments}</strong> supporting documents successfully analyzed as business evidence.
            </p>
            {analysis.evidenceCoverage.impactStatement && (
              <p className="text-[11px] text-neutral-600 bg-[#FAF8F2] p-2.5 rounded-xl border border-[#E5DFD4]">
                {analysis.evidenceCoverage.impactStatement}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Evidence ledger</CardTitle><CardDescription className="text-xs">Every important conclusion should be traceable to an available source.</CardDescription></CardHeader><CardContent>{evidence.length ? <div className="space-y-3">{evidence.map((item, index) => <div key={`${item.statement}-${index}`} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className="border-[#E5DFD4] text-[10px]">{item.status}</Badge><span className="text-[10px] text-neutral-500">{item.source} ┬╖ {item.sourceType} ┬╖ {item.confidence}% confidence</span></div><p className="text-xs text-neutral-800 mt-2">{item.statement}</p></div>)}</div> : <p className="text-xs text-neutral-500">No traceable evidence has been persisted yet. INTELLY will not present unsupported conclusions as facts.</p>}</CardContent></Card>

      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Problems, root causes, and impact</CardTitle><CardDescription className="text-xs">Separate symptoms from underlying causes and business consequences.</CardDescription></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">{section("Observed problems", analysis.problems || analysis.risksAndGaps)}{section("Root causes", analysis.rootCauses)}{section("Business impact", analysis.businessImpact)}</CardContent></Card>

      {analysis.processBottlenecks && analysis.processBottlenecks.length > 0 && (
        <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900">
              Process Bottlenecks & Operational Gaps
            </CardTitle>
            <CardDescription className="text-xs">
              Operational frictions, manual handoffs, and data quality barriers uncovered across documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.processBottlenecks.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-[#FAF8F2] rounded-xl border border-[#E5DFD4] text-xs text-neutral-800">
                ΓùÅ {item}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {analysis.functionalRequirements && analysis.functionalRequirements.length > 0 && (
        <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900">
              Traceable Functional Requirements ({analysis.functionalRequirements.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Capabilities directly derived from discovered problems, workflow gaps, and evidence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.functionalRequirements.map((req) => (
              <div key={req.id} className="p-3.5 bg-[#FAF8F2] rounded-xl border border-[#E5DFD4] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-neutral-900">{req.id}: {req.title}</span>
                  <Badge variant="outline" className="text-[10px] border-[#E5DFD4]">{req.priority}</Badge>
                </div>
                <p className="text-neutral-700">{req.description}</p>
                {req.sourceEvidence && (
                  <p className="text-[10px] text-neutral-500 font-semibold">Provenance: {req.sourceEvidence}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {problemMap && problemMap.nodes?.length > 0 && <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><CardTitle className="text-base font-extrabold text-neutral-900">Business problem map</CardTitle><CardDescription className="text-xs">Click a node to inspect its evidence and relationship to the transformation.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{problemMap.nodes.map((node) => <button type="button" key={node.id} onClick={() => setSelectedNode(node.id)} className={`rounded-full border px-3 py-2 text-xs font-bold ${selectedNode === node.id ? "border-[#18181C] bg-[#18181C] text-white" : "border-[#E5DFD4] bg-[#FAF8F2] text-neutral-700"}`}>{node.label}<span className="ml-1 text-[9px] opacity-60">{node.type}</span></button>)}</div>{selectedNodeData && <div className="mt-4 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-4"><p className="text-sm font-extrabold text-neutral-900">{selectedNodeData.label}</p><p className="text-xs text-neutral-700 mt-2">{selectedNodeData.description || "No additional description was returned."}</p>{selectedNodeData.evidenceIds?.length > 0 && <p className="text-[10px] text-neutral-500 mt-2">Evidence IDs: {selectedNodeData.evidenceIds.join(", ")}</p>}</div>}</CardContent></Card>}

      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><CardTitle className="text-base font-extrabold text-neutral-900">Solution options</CardTitle><CardDescription className="text-xs">Compare viable approaches before selecting a transformation direction.</CardDescription></div><Button onClick={challenge} variant="outline" className="border-[#E5DFD4] text-xs font-bold rounded-full gap-2"><Sparkles className="w-3.5 h-3.5" /> Challenge this solution</Button></div></CardHeader><CardContent>{solutionOptions.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{solutionOptions.map((option) => <div key={option.id} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-neutral-900">{option.name}</p><p className="text-xs text-neutral-600 mt-1">{option.approach || option.whatItSolves}</p></div><Badge className="bg-[#FEE895] text-neutral-900 border-none text-[10px]">{option.complexity}</Badge></div><div className="grid grid-cols-1 gap-2 mt-3 text-[11px] text-neutral-700">{option.benefits?.length > 0 && <p><strong>Benefits:</strong> {option.benefits.join(" ┬╖ ")}</p>}{option.risks?.length > 0 && <p><strong>Risks:</strong> {option.risks.join(" ┬╖ ")}</p>}{option.tradeoffs?.length > 0 && <p><strong>Trade-offs:</strong> {option.tradeoffs.join(" ┬╖ ")}</p>}<p><strong>Estimation:</strong> {option.requiresFurtherEstimation ? "Requires further estimation" : option.implementationEffort}</p></div>{option.evidence?.length > 0 && <p className="text-[10px] text-neutral-500 mt-3">Evidence: {option.evidence.join(" ┬╖ ")}</p>}</div>)}</div> : recommendations.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{recommendations.map((item) => <div key={item.id} className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3"><p className="text-xs font-extrabold text-neutral-900">{item.name}</p><p className="text-[11px] text-neutral-600 mt-1">{item.description || item.rationale}</p><p className="text-[10px] text-neutral-500 mt-2">Confidence {item.confidence}%</p></div>)}</div> : <p className="text-xs text-neutral-500">No solution options have been generated. Complete discovery and validate the current understanding first.</p>}</CardContent></Card>
    </> : <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardContent className="py-10 text-center"><p className="text-sm font-extrabold text-neutral-900">No persisted Business Analysis yet</p><p className="text-xs text-neutral-500 mt-2">Complete INTELLY Discovery, validate the evidence, and then generate the analysis.</p><Button onClick={() => generateAnalysis()} disabled={generating} className="mt-5 bg-[#18181C] text-white rounded-full text-xs font-bold gap-2">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Business Analysis</Button></CardContent></Card>}

    <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-base font-extrabold text-neutral-900">As-Is / To-Be Gap Analysis</CardTitle><CardDescription className="text-xs">Optional structured gap output generated from the same context.</CardDescription></div><Button variant="outline" onClick={generateGap} className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {gap ? "Regenerate" : "Generate"}</Button></CardHeader><CardContent>{gap ? <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="rounded-2xl bg-[#FAF8F2] p-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">AS-IS</p><p className="text-xs text-neutral-700 mt-1">{gap.currentState || "Not provided"}</p></div><div className="rounded-2xl bg-[#FAF8F2] p-3"><p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">TO-BE</p><p className="text-xs text-neutral-700 mt-1">{gap.futureState || "Not provided"}</p></div></div>{gap.gapItems?.map((item) => <div key={item.id || item.area} className="rounded-2xl border border-[#E5DFD4] p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-extrabold text-neutral-900">{item.area}</p><Badge variant="outline" className="border-[#E5DFD4] text-[10px]">{item.gapSeverity}</Badge></div><p className="text-[11px] text-neutral-600 mt-2">Current: {item.currentDeficiency}</p><p className="text-[11px] text-neutral-600">Target: {item.desiredTarget}</p><p className="text-[11px] text-neutral-800 mt-1">Action: {item.recommendedAction}</p></div>)}{gap.stakeholderImpact && gap.stakeholderImpact.length > 0 && <div><p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Stakeholder impact</p><div className="mt-2 space-y-1">{gap.stakeholderImpact?.map((item) => <p key={item.stakeholderGroup} className="text-xs text-neutral-700">{item.stakeholderGroup}: {item.impactDescription} ({item.readinessLevel})</p>)}</div></div>}</div> : <p className="text-xs text-neutral-500">No gap analysis has been generated.</p>}</CardContent></Card>
    {onOpenAi && <Button onClick={onOpenAi} variant="ghost" className="text-xs font-bold rounded-full gap-2"><Sparkles className="w-3.5 h-3.5 text-[#F472B6]" /> Ask the project-aware AI companion <ExternalLink className="w-3 h-3" /></Button>}
  </div>
}