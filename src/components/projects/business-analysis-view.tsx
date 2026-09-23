"use client"

import React, { useState } from "react"
import { Sparkles, Plus, Trash2, RefreshCw, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface BusinessAnalysisViewProps {
  projectId: string
  digitalMaturity?: number
  aiReadiness?: number
  discoveryCompleteness?: number
  onScoreUpdate?: () => void
  onOpenAi?: () => void
}

interface GapItem {
  id: string
  domain: string
  currentState: string
  futureState: string
  impactLevel: "HIGH" | "MEDIUM" | "LOW"
}

export function BusinessAnalysisView({
  projectId,
  digitalMaturity = 78,
  aiReadiness = 82,
  discoveryCompleteness = 85,
  onScoreUpdate,
  onOpenAi
}: BusinessAnalysisViewProps) {
  const [recalculating, setRecalculating] = useState(false)
  const [scores, setScores] = useState({
    digitalMaturity,
    aiReadiness,
    discoveryCompleteness
  })

  // SWOT Matrix State
  const [swot, setSwot] = useState({
    strengths: ["Established customer base", "Defined domain workflows", "High team domain expertise"],
    weaknesses: ["Manual paper-based approval bottlenecks", "Legacy monolithic database", "No real-time analytics"],
    opportunities: ["Automate order routing with AI", "Cloud SaaS multi-tenant transition", "Mobile app checkout"],
    threats: ["Fast-moving agile competitors", "Data privacy regulation changes", "Legacy hardware obsolescence"]
  })
  const [newSwotText, setNewSwotText] = useState<Record<string, string>>({})

  // Gap Matrix State
  const [gaps, setGaps] = useState<GapItem[]>([
    {
      id: "gap-1",
      domain: "Inventory Processing",
      currentState: "Batch update once daily at midnight causing frequent out-of-stock orders.",
      futureState: "Event-driven WebSocket API with real-time stock sync across all physical stores.",
      impactLevel: "HIGH"
    },
    {
      id: "gap-[#2]",
      domain: "Customer Support Intake",
      currentState: "Email support ticket queue with 24-48 hour average response latency.",
      futureState: "AI RAG chatbot handling 70% of tier-1 support queries instantly.",
      impactLevel: "MEDIUM"
    }
  ])

  const [newGapDomain, setNewGapDomain] = useState("")
  const [newGapCurrent, setNewGapCurrent] = useState("")
  const [newGapFuture, setNewGapFuture] = useState("")

  const handleRecalculateScores = async () => {
    setRecalculating(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/discovery/recalculate`, {
        method: "POST"
      })
      const data = await res.json()
      if (res.ok) {
        setScores({
          digitalMaturity: data.digitalMaturity,
          aiReadiness: data.aiReadiness,
          discoveryCompleteness: data.discoveryCompleteness
        })
        toast.success("Readiness scorecards updated via AI audit!")
        if (onScoreUpdate) onScoreUpdate()
      } else {
        throw new Error(data.error || "Failed to recalculate scores")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating scores")
    } finally {
      setRecalculating(false)
    }
  }

  const handleAddSwotItem = (key: keyof typeof swot) => {
    const text = newSwotText[key]?.trim()
    if (!text) return
    setSwot(prev => ({ ...prev, [key]: [...prev[key], text] }))
    setNewSwotText(prev => ({ ...prev, [key]: "" }))
    toast.success("SWOT item added")
  }

  const handleRemoveSwotItem = (key: keyof typeof swot, index: number) => {
    setSwot(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }))
  }

  const handleAddGap = () => {
    if (!newGapDomain.trim() || !newGapCurrent.trim() || !newGapFuture.trim()) {
      toast.error("Please fill in domain, current state, and future state.")
      return
    }
    const newGap: GapItem = {
      id: `gap-${Date.now()}`,
      domain: newGapDomain.trim(),
      currentState: newGapCurrent.trim(),
      futureState: newGapFuture.trim(),
      impactLevel: "HIGH"
    }
    setGaps(prev => [...prev, newGap])
    setNewGapDomain("")
    setNewGapCurrent("")
    setNewGapFuture("")
    toast.success("Gap analysis row added")
  }

  const handleRemoveGap = (id: string) => {
    setGaps(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Readiness Scorecards */}
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5DFD4]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-extrabold text-neutral-900">
                Transformation Diagnostic Scorecards
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time evaluation of digital maturity, cloud AI readiness, and discovery completeness.
              </CardDescription>
            </div>

            <Button
              onClick={handleRecalculateScores}
              disabled={recalculating}
              className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-5 py-2 gap-2 shrink-0"
            >
              {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-[#FEE895]" />}
              Recalculate Scores
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-neutral-900">
              <span>Digital Maturity</span>
              <span className="text-sm font-black">{scores.digitalMaturity}%</span>
            </div>
            <Progress value={scores.digitalMaturity} className="h-2 bg-neutral-200" />
            <p className="text-[11px] text-neutral-500">Evaluates current legacy automation level.</p>
          </div>

          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-neutral-900">
              <span>AI & Cloud Readiness</span>
              <span className="text-sm font-black">{scores.aiReadiness}%</span>
            </div>
            <Progress value={scores.aiReadiness} className="h-2 bg-neutral-200" />
            <p className="text-[11px] text-neutral-500">Measures API readiness & data structure.</p>
          </div>

          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-neutral-900">
              <span>Discovery Completeness</span>
              <span className="text-sm font-black">{scores.discoveryCompleteness}%</span>
            </div>
            <Progress value={scores.discoveryCompleteness} className="h-2 bg-neutral-200" />
            <p className="text-[11px] text-neutral-500">Reqs clarity & Q&A completeness ratio.</p>
          </div>
        </CardContent>
      </Card>

      {/* 2. SWOT Matrix */}
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5DFD4]">
          <CardTitle className="text-base font-extrabold text-neutral-900">
            Interactive SWOT Matrix
          </CardTitle>
          <CardDescription className="text-xs">
            Strengths, Weaknesses, Opportunities, and Threats assessment.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider">Strengths</h4>
            <div className="space-y-1.5">
              {swot.strengths.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-emerald-100 text-xs font-medium text-neutral-800">
                  <span>{item}</span>
                  <button onClick={() => handleRemoveSwotItem("strengths", idx)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSwotText.strengths || ""}
                onChange={(e) => setNewSwotText(prev => ({ ...prev, strengths: e.target.value }))}
                placeholder="Add strength..."
                className="bg-white border-emerald-200 text-xs rounded-xl"
              />
              <Button onClick={() => handleAddSwotItem("strengths")} size="sm" className="bg-emerald-800 text-white rounded-xl text-xs">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Weaknesses */}
          <div className="bg-red-50/60 border border-red-200 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-red-900 uppercase tracking-wider">Weaknesses</h4>
            <div className="space-y-1.5">
              {swot.weaknesses.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-red-100 text-xs font-medium text-neutral-800">
                  <span>{item}</span>
                  <button onClick={() => handleRemoveSwotItem("weaknesses", idx)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSwotText.weaknesses || ""}
                onChange={(e) => setNewSwotText(prev => ({ ...prev, weaknesses: e.target.value }))}
                placeholder="Add weakness..."
                className="bg-white border-red-200 text-xs rounded-xl"
              />
              <Button onClick={() => handleAddSwotItem("weaknesses")} size="sm" className="bg-red-800 text-white rounded-xl text-xs">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Opportunities */}
          <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider">Opportunities</h4>
            <div className="space-y-1.5">
              {swot.opportunities.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-blue-100 text-xs font-medium text-neutral-800">
                  <span>{item}</span>
                  <button onClick={() => handleRemoveSwotItem("opportunities", idx)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSwotText.opportunities || ""}
                onChange={(e) => setNewSwotText(prev => ({ ...prev, opportunities: e.target.value }))}
                placeholder="Add opportunity..."
                className="bg-white border-blue-200 text-xs rounded-xl"
              />
              <Button onClick={() => handleAddSwotItem("opportunities")} size="sm" className="bg-blue-800 text-white rounded-xl text-xs">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Threats */}
          <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl space-y-3">
            <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider">Threats</h4>
            <div className="space-y-1.5">
              {swot.threats.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-amber-100 text-xs font-medium text-neutral-800">
                  <span>{item}</span>
                  <button onClick={() => handleRemoveSwotItem("threats", idx)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSwotText.threats || ""}
                onChange={(e) => setNewSwotText(prev => ({ ...prev, threats: e.target.value }))}
                placeholder="Add threat..."
                className="bg-white border-amber-200 text-xs rounded-xl"
              />
              <Button onClick={() => handleAddSwotItem("threats")} size="sm" className="bg-amber-800 text-white rounded-xl text-xs">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. As-Is vs. To-Be Gap Analysis Matrix */}
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5DFD4]">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-extrabold text-neutral-900">
                Current (As-Is) vs. Future (To-Be) Gap Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Map baseline legacy capabilities directly to target system architecture.
              </CardDescription>
            </div>
            {onOpenAi && (
              <Button onClick={onOpenAi} size="sm" className="bg-[#18181C] text-white text-xs font-bold rounded-full gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
                Generate Gap Matrix
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="border border-[#E5DFD4] rounded-2xl overflow-hidden divide-y divide-[#E5DFD4]">
            {gaps.map((gap) => (
              <div key={gap.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-[#FAF8F2] transition-colors">
                <div className="md:col-span-3">
                  <Badge className="bg-[#18181C] text-white border-none text-[10px] font-bold mb-1">
                    {gap.domain}
                  </Badge>
                  <p className="text-[11px] text-neutral-500 font-bold uppercase">Impact: {gap.impactLevel}</p>
                </div>
                <div className="md:col-span-4 bg-red-50/70 border border-red-200 p-3 rounded-xl text-xs text-neutral-800">
                  <span className="font-extrabold text-red-900 block text-[10px] uppercase mb-0.5">As-Is (Current)</span>
                  {gap.currentState}
                </div>
                <div className="md:col-span-4 bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl text-xs text-neutral-800">
                  <span className="font-extrabold text-emerald-900 block text-[10px] uppercase mb-0.5">To-Be (Target)</span>
                  {gap.futureState}
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button onClick={() => handleRemoveGap(gap.id)} className="text-neutral-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Gap Entry Form */}
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-3">
            <h5 className="font-extrabold text-xs text-neutral-900">Add Custom Gap Analysis Item</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={newGapDomain}
                onChange={(e) => setNewGapDomain(e.target.value)}
                placeholder="Domain (e.g. Payments)"
                className="bg-white border-[#E5DFD4] text-xs rounded-xl"
              />
              <Input
                value={newGapCurrent}
                onChange={(e) => setNewGapCurrent(e.target.value)}
                placeholder="Current State (As-Is)"
                className="bg-white border-[#E5DFD4] text-xs rounded-xl"
              />
              <Input
                value={newGapFuture}
                onChange={(e) => setNewGapFuture(e.target.value)}
                placeholder="Future State (To-Be)"
                className="bg-white border-[#E5DFD4] text-xs rounded-xl"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddGap} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-5 gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Add Gap Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
