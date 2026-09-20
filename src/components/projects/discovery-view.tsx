"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Zap, CheckCircle, AlertCircle, Hammer, ExternalLink, Cpu, Route, Workflow, Layout, Database, Calculator, Activity } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { IntakeAnalysisData } from "@/modules/deliverables/intake-analysis"

type SystemSelection = Record<string, boolean>
type QAAnswers = Record<string, string>

export function DiscoveryView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeEngineTask, setActiveEngineTask] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)
  const [analysis, setAnalysis] = useState<IntakeAnalysisData | null>(null)
  const [selected, setSelected] = useState<SystemSelection>({})
  const [answers, setAnswers] = useState<QAAnswers>({})
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [generatedDeliverables, setGeneratedDeliverables] = useState<Record<string, any>>({})

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS`)
      if (res.ok) {
        const d = await res.json()
        if (d?.currentVersionId) {
          const vRes = await fetch(`/api/projects/${projectId}/deliverables/INTAKE_ANALYSIS/versions/${d.currentVersionId}`)
          if (vRes.ok) {
            const v = await vRes.json()
            const data = v.content as IntakeAnalysisData
            setAnalysis(data)
            const sel: SystemSelection = {}
            data.recommendedSystems?.forEach(s => { sel[s.id] = s.priority === "MUST" })
            setSelected(sel)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchAnalysis() }, [fetchAnalysis])

  const handleGenerateEngine = async (deliverableType: string, label: string) => {
    setGenerating(true)
    setActiveEngineTask(label)
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: deliverableType })
      })
      if (!res.ok) throw new Error(`Failed to generate ${label}`)
      const data = await res.json()
      setGeneratedDeliverables((prev) => ({ ...prev, [deliverableType]: data }))
      toast.success(`${label} generated successfully!`)
      if (deliverableType === "INTAKE_ANALYSIS") fetchAnalysis()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation error")
    } finally {
      setGenerating(false)
      setActiveEngineTask(null)
    }
  }

  const handleBuild = async () => {
    const selectedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    if (selectedIds.length === 0) { toast.error("Select at least one system"); return }
    setBuilding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemIds: selectedIds, language: "en" })
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      toast.success("Systems built! Redirecting...")
      setTimeout(() => router.push(`/projects/${projectId}/system`), 1200)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Build failed")
    } finally {
      setBuilding(false)
    }
  }

  const transformationEngines = [
    { type: "INTAKE_ANALYSIS", label: "Business Analysis Engine", icon: Zap, color: "bg-[#FEE895]" },
    { type: "ARCHITECTURE_HLD", label: "Solution Architecture Builder", icon: Cpu, color: "bg-[#A3C0E4]" },
    { type: "ROADMAP", label: "Transformation Planner", icon: Route, color: "bg-[#F8B4D9]" },
    { type: "PROCESS_MAP", label: "Process Intelligence Designer", icon: Workflow, color: "bg-[#B8DF9E]" },
    { type: "WIREFRAMES", label: "AI UX Designer", icon: Layout, color: "bg-[#FDE8F3]" },
    { type: "DATABASE_DESIGN", label: "Database & Integration Designer", icon: Database, color: "bg-[#DBEAFE]" },
    { type: "ESTIMATION", label: "AI Planning Engine", icon: Calculator, color: "bg-[#DCFCE7]" },
    { type: "GAP_ANALYSIS", label: "Gap & Digital Maturity Engine", icon: Activity, color: "bg-[#FEF3C7]" },
  ]

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-neutral-800" /></div>
  }

  return (
    <div className="space-y-8 font-sans">
      {/* 9 Core Transformation Engines Grid */}
      <div>
        <h3 className="text-lg font-extrabold text-neutral-900 mb-1">AI Solution Builder & Transformation Suite</h3>
        <p className="text-xs text-neutral-500 mb-4">Click any AI Transformation Engine to generate specs, blueprints, and architecture.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {transformationEngines.map((engine) => {
            const Icon = engine.icon
            const isDone = !!generatedDeliverables[engine.type]
            const isCurrent = activeEngineTask === engine.label

            return (
              <button
                key={engine.type}
                onClick={() => handleGenerateEngine(engine.type, engine.label)}
                disabled={generating}
                className={`${engine.color} hover:opacity-90 border border-neutral-300/60 rounded-[20px] p-3 text-left transition-all shadow-sm flex flex-col justify-between h-28 group relative overflow-hidden`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="h-7 w-7 rounded-full bg-black/10 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-neutral-900" />
                  </div>
                  {isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-neutral-900" />
                  ) : isDone ? (
                    <CheckCircle className="h-4 w-4 text-emerald-800" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-neutral-700 group-hover:scale-110 transition-transform" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-extrabold text-neutral-900 line-clamp-1">{engine.label}</p>
                  <p className="text-[10px] text-neutral-700 font-medium">{isDone ? "Generated ✓" : "Generate Spec"}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Business Summary */}
      {analysis ? (
        <Card className="border-[#E5DFD4] bg-[#FAF8F2] rounded-[24px]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Business Discovery Summary
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">Lang: {analysis.detectedLanguage?.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-neutral-800 leading-relaxed">{analysis.businessSummary}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className="bg-[#FEE895] text-neutral-900 border-none font-bold text-xs">{analysis.industry}</Badge>
              <Badge className="bg-[#F8B4D9] text-neutral-900 border-none font-bold text-xs">{analysis.businessType}</Badge>
              {analysis.knownEntities?.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="ghost" size="sm" onClick={() => handleGenerateEngine("INTAKE_ANALYSIS", "Business Analysis Engine")} disabled={generating} className="text-xs">
              {generating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
              Re-analyze Business Context
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="border-dashed border-[#E5DFD4] bg-[#FAF8F2] rounded-[24px] text-center p-8">
          <div className="w-12 h-12 bg-[#FEE895] rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-neutral-900" />
          </div>
          <CardTitle className="text-lg font-bold">AI Discovery Session</CardTitle>
          <CardDescription className="text-xs">Run initial business analysis to unlock architecture models, roadmaps, and workflows.</CardDescription>
          <CardFooter className="flex justify-center pt-6">
            <Button size="lg" onClick={() => handleGenerateEngine("INTAKE_ANALYSIS", "Business Analysis Engine")} disabled={generating} className="bg-[#18181C] hover:bg-neutral-800 text-white rounded-full text-xs font-bold px-6">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : "Start AI Discovery"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Missing Information Q&A */}
      {analysis && analysis.missingInformation?.length > 0 && (
        <div>
          <h3 className="font-bold text-sm text-neutral-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Clarifying Questions
          </h3>
          <div className="space-y-3">
            {analysis.missingInformation.map(q => (
              <Card key={q.id} className="bg-white border-[#E5DFD4] rounded-[20px]">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs font-bold text-neutral-900 mb-1">{q.question}</p>
                  <p className="text-[11px] text-neutral-500 mb-3">{q.whyItMatters}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {q.suggestedAnswers.map(ans => (
                      <button
                        key={ans}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${answers[q.id] === ans ? "bg-[#18181C] text-white border-black font-semibold" : "bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-700"}`}
                      >
                        {ans}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Type custom answer..."
                    value={answers[q.id] && answers[q.id] !== "AI_DECIDE" ? answers[q.id] : ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="text-xs h-8 rounded-full border-[#E5DFD4]"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Systems */}
      {analysis && (
        <div>
          <h3 className="font-bold text-sm text-neutral-900 mb-3">
            {analysis.mode === "USER_SPECIFIED" ? "Requested Systems" : "Recommended Solution Architecture"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysis.recommendedSystems?.map(sys => (
              <Card
                key={sys.id}
                className={`cursor-pointer transition-all rounded-[22px] border ${selected[sys.id] ? "border-black bg-white shadow-md" : "border-[#E5DFD4] bg-[#FAF8F2] hover:bg-white"}`}
                onClick={() => setSelected(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selected[sys.id]}
                        onChange={() => setSelected(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                        className="h-4 w-4 accent-black mt-0.5"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="font-bold text-xs text-neutral-900">{sys.name}</span>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={sys.priority === "MUST" ? "default" : "secondary"} className="text-[10px]">{sys.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">{sys.confidence}%</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 ml-6 mb-2">{sys.whyRecommended}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Build Action Banner */}
      <Card className="border-black bg-[#18181C] text-white rounded-[26px] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-sm text-white">Generate Code & Workable System</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Build full interactive React web application and database APIs for selected modules.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/system`)}
              className="bg-transparent border-neutral-700 text-white hover:bg-neutral-800 text-xs rounded-full"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-2" /> Open System Runtime
            </Button>
            <Button onClick={handleBuild} disabled={building} className="bg-[#F472B6] hover:bg-pink-600 text-neutral-900 font-extrabold text-xs rounded-full px-5">
              {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4 mr-2" />}
              Build System Runtime
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
