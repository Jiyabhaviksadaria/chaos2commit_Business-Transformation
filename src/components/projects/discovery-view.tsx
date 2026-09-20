"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Zap, CheckCircle, AlertCircle, Hammer, ExternalLink } from "lucide-react"
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
  const [building, setBuilding] = useState(false)
  const [analysis, setAnalysis] = useState<IntakeAnalysisData | null>(null)
  const [selected, setSelected] = useState<SystemSelection>({})
  const [answers, setAnswers] = useState<QAAnswers>({})
  const [challengeId, setChallengeId] = useState<string | null>(null)

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
            // Pre-select MUST systems and user-stated systems
            const sel: SystemSelection = {}
            data.recommendedSystems.forEach(s => { sel[s.id] = s.priority === "MUST" })
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

  const handleAnalyze = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "INTAKE_ANALYSIS" })
      })
      if (!res.ok) throw new Error("Failed to generate analysis")
      toast.success("Analysis complete!")
      fetchAnalysis()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error analyzing")
    } finally {
      setGenerating(false)
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!analysis) {
    return (
      <Card className="border-dashed shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>AI Intake Analysis</CardTitle>
          <CardDescription>Let AI analyze your business context and recommend the systems to build.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-6">
          <Button size="lg" onClick={handleAnalyze} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : "Analyze Intake"}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div className="space-y-6">
      {/* Business Summary */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" /> Here&apos;s what I understood
            </CardTitle>
            <Badge variant="outline">Lang: {analysis.detectedLanguage?.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{analysis.businessSummary}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">{analysis.industry}</Badge>
            <Badge variant="secondary">{analysis.businessType}</Badge>
            {analysis.knownEntities.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button variant="ghost" size="sm" onClick={handleAnalyze} disabled={generating}>
            {generating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
            Re-analyze
          </Button>
        </CardFooter>
      </Card>

      {/* Missing Information Q&A */}
      {analysis.missingInformation.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> A few clarifying questions
          </h3>
          <div className="space-y-4">
            {analysis.missingInformation.map(q => (
              <Card key={q.id} className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <p className="text-sm font-medium mb-1">{q.question}</p>
                  <p className="text-xs text-muted-foreground mb-3">{q.whyItMatters}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {q.suggestedAnswers.map(ans => (
                      <button
                        key={ans}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${answers[q.id] === ans ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-primary/10 border-border"}`}
                      >
                        {ans}
                      </button>
                    ))}
                    <button
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: "AI_DECIDE" }))}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${answers[q.id] === "AI_DECIDE" ? "bg-muted-foreground text-background border-muted-foreground" : "bg-background hover:bg-muted border-border"}`}
                    >
                      Let AI decide
                    </button>
                  </div>
                  <Input
                    placeholder="Or type your own answer..."
                    value={answers[q.id] && answers[q.id] !== "AI_DECIDE" ? answers[q.id] : ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="text-sm h-8"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Systems */}
      <div>
        <h3 className="font-semibold mb-3">
          {analysis.mode === "USER_SPECIFIED" ? "Your requested systems" : "Recommended systems for your business"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analysis.recommendedSystems.map(sys => (
            <Card
              key={sys.id}
              className={`cursor-pointer transition-all ${selected[sys.id] ? "border-primary/60 bg-primary/5" : "hover:border-primary/30"}`}
              onClick={() => setSelected(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected[sys.id]}
                      onChange={() => setSelected(prev => ({ ...prev, [sys.id]: !prev[sys.id] }))}
                      className="h-4 w-4 accent-primary mt-0.5"
                      onClick={e => e.stopPropagation()}
                    />
                    <span className="font-medium text-sm">{sys.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={sys.priority === "MUST" ? "default" : "secondary"} className="text-xs">{sys.priority}</Badge>
                    <Badge variant="outline" className="text-xs">{sys.confidence}%</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-6 mb-2">{sys.whyRecommended}</p>
                <div className="flex flex-wrap gap-1 ml-6">
                  {sys.evidence.slice(0, 2).map((ev, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">{ev}</span>
                  ))}
                </div>
                <div className="mt-2 ml-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 text-muted-foreground"
                    onClick={e => { e.stopPropagation(); setChallengeId(challengeId === sys.id ? null : sys.id) }}
                  >
                    {challengeId === sys.id ? "Hide" : "Challenge this"}
                  </Button>
                  {challengeId === sys.id && (
                    <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                      Counter-argument: Consider whether {sys.name.toLowerCase()} is needed immediately. 
                      Start with just the core {analysis.industry.toLowerCase()} workflow and add {sys.name.toLowerCase()} when you have validated traction.
                      Risk: premature complexity vs. speed to launch.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Build Button */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Ready to build?</p>
              <p className="text-sm text-muted-foreground">
                {anySelected
                  ? `${Object.values(selected).filter(Boolean).length} system(s) selected — costs 5 credits`
                  : "Select at least one system to continue"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}/system`)}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" /> View Existing System
              </Button>
              <Button onClick={handleBuild} disabled={!anySelected || building} size="lg" className="gap-2">
                {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />}
                Build my system(s)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">{analysis.disclaimer}</p>
    </div>
  )
}
