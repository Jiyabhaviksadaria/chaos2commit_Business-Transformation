"use client"

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Info,
  Shield,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner"

interface BlueprintViewProps {
  projectId: string
  onOpenAi?: () => void
}

interface BlueprintRequirement {
  id: string
  title: string
  category: "KNOWN" | "UNKNOWN" | "ASSUMED" | "REQUIRES_DECISION"
  description: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: string
  explainability?: {
    why: string
    contextUsed: string
    evidence: string
    assumptions: string
    alternatives: string
    confidence: number
  }
}

interface MasterBlueprintData {
  productOverview: string
  businessObjective: string
  productObjective: string
  targetUsers: string[]
  userRoles: { role: string; description: string; permissions: string[] }[]
  modules: { key: string; name: string; description: string }[]
  features: { key: string; title: string; moduleKey: string; priority: string }[]
  requirements: BlueprintRequirement[]
  nonFunctionalRequirements: { category: string; description: string }[]
  businessRules: { ruleId: string; title: string; rule: string }[]
  workflows: { name: string; trigger: string; steps: string[] }[]
  integrations: { name: string; type: string; details: string }[]
  aiFeatures: { name: string; description: string; model: string }[]
  security: { auth: string; rbac: boolean; compliance: string[] }
  architecture: { type: string; stack: string[] }
  ux: { theme: string; layout: string }
  database: { dialect: string; ORM: string }
  deployment: { provider: string; environment: string }
  estimatedComplexity: string
  buildStatus: string
}

export function BlueprintView({ projectId, onOpenAi }: BlueprintViewProps) {
  const [blueprint, setBlueprint] = useState<MasterBlueprintData | null>(null)
  const [lifecycle, setLifecycle] = useState<string>("BLUEPRINT")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [affectedCount] = useState<number>(0)
  
  // Explainability modal state
  const [selectedExplainability, setSelectedExplainability] = useState<BlueprintRequirement["explainability"] | null>(null)
  
  // Section expand collapse
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    requirements: true,
    roles: true,
    modules: true,
    architecture: true
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  useEffect(() => {
    fetchBlueprint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchBlueprint = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/blueprint`)
      if (res.ok) {
        const data = await res.json()
        setLifecycle(data.lifecycle || "BLUEPRINT")
        if (data.blueprint) {
          setBlueprint(data.blueprint)
        }
      }
    } catch {
      toast.error("Failed to load Master Blueprint")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBlueprint = async () => {
    try {
      setGenerating(true)
      const res = await fetch(`/api/projects/${projectId}/blueprint`, {
        method: "POST"
      })
      if (res.ok) {
        const data = await res.json()
        setBlueprint(data.blueprint)
        setLifecycle(data.lifecycle)
        toast.success("Master Architectural Blueprint generated!")
      } else {
        const err = await res.json()
        throw new Error(err.error || "Blueprint generation failed")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generating blueprint")
    } finally {
      setGenerating(false)
    }
  }

  const handleApproveAndBuild = async () => {
    try {
      setApproving(true)
      const res = await fetch(`/api/projects/${projectId}/blueprint/approve`, {
        method: "POST"
      })
      if (res.ok) {
        const data = await res.json()
        setLifecycle(data.lifecycle)
        toast.success("Blueprint Approved! System transitioned to BUILDING state.")
      } else {
        const err = await res.json()
        throw new Error(err.error || "Approval failed")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error approving blueprint")
    } finally {
      setApproving(false)
    }
  }

  const getCategoryBadge = (cat: BlueprintRequirement["category"]) => {
    switch (cat) {
      case "KNOWN":
        return <Badge className="bg-emerald-100 text-emerald-900 border-none text-[10px] font-bold">KNOWN</Badge>
      case "UNKNOWN":
        return <Badge className="bg-red-100 text-red-900 border-none text-[10px] font-bold">UNKNOWN</Badge>
      case "ASSUMED":
        return <Badge className="bg-amber-100 text-amber-900 border-none text-[10px] font-bold">ASSUMED</Badge>
      case "REQUIRES_DECISION":
        return <Badge className="bg-purple-100 text-purple-900 border-none text-[10px] font-bold">DECISION REQD</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{cat}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center space-y-3 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-800" />
        <p className="text-xs text-neutral-500 font-semibold">Loading Master Architectural Blueprint...</p>
      </div>
    )
  }

  if (!blueprint) {
    return (
      <div className="p-10 flex flex-col items-center justify-center bg-white border border-[#E5DFD4] rounded-[26px] space-y-5 font-sans text-center shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-[#FAF8F2] border border-[#E5DFD4] flex items-center justify-center text-neutral-800 shadow-sm">
          <Layers className="h-7 w-7 text-neutral-800" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-extrabold text-neutral-900 mb-1">No Master Blueprint Generated</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            The Master Blueprint synthesizes all 26 core architectural specs into an actionable blueprint for the AI System Builder.
          </p>
        </div>
        <Button
          onClick={handleGenerateBlueprint}
          disabled={generating}
          className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2.5 gap-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#F472B6]" />}
          Generate Master Blueprint with AI
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Affected Deliverable Banner */}
      {affectedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{affectedCount} deliverable specifications are affected by recent Blueprint updates.</span>
          </div>
          <Button size="sm" className="bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-bold rounded-full">
            Regenerate Affected Artifacts
          </Button>
        </div>
      )}

      {/* Blueprint Approval Gate Card */}
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm overflow-hidden">
        <div className="bg-[#18181C] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#FEE895] text-neutral-900 font-extrabold text-[10px]">
                LIFECYCLE: {lifecycle}
              </Badge>
              <Badge className="bg-emerald-400 text-neutral-950 font-extrabold text-[10px]">
                BLUEPRINT READY
              </Badge>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">Master Architectural Blueprint Gate</h3>
            <p className="text-xs text-neutral-400">
              Review and approve the master system specification to initiate automated software build execution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={onOpenAi}
              className="bg-transparent border-neutral-700 hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" /> ASK AI
            </Button>

            <Button
              onClick={handleApproveAndBuild}
              disabled={approving || lifecycle === "BUILDING"}
              className="bg-[#B8DF9E] hover:bg-[#a6d48a] text-neutral-950 text-xs font-black rounded-full px-6 py-2.5 gap-2 shadow-sm"
            >
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {lifecycle === "BUILDING" ? "BUILDING IN PROGRESS" : "APPROVE & BUILD APPLICATION"}
            </Button>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Section 1: Overview & Objectives */}
          <div className="border border-[#E5DFD4] rounded-2xl p-5 bg-[#FAF8F2]">
            <div
              onClick={() => toggleSection("overview")}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h4 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-neutral-800" />
                Product Overview & Business Objectives
              </h4>
              {expandedSections.overview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {expandedSections.overview && (
              <div className="mt-4 space-y-3 text-xs text-neutral-700">
                <div>
                  <span className="font-bold text-neutral-900 block mb-1">Product Overview:</span>
                  <p className="bg-white border border-[#E5DFD4] p-3 rounded-xl leading-relaxed">{blueprint.productOverview || "No overview provided."}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="font-bold text-neutral-900 block mb-1">Business Objective:</span>
                    <p className="bg-white border border-[#E5DFD4] p-3 rounded-xl leading-relaxed">{blueprint.businessObjective || "N/A"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-900 block mb-1">Product Objective:</span>
                    <p className="bg-white border border-[#E5DFD4] p-3 rounded-xl leading-relaxed">{blueprint.productObjective || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Requirements Categorization (KNOWN, UNKNOWN, ASSUMED, REQUIRES_DECISION) */}
          <div className="border border-[#E5DFD4] rounded-2xl p-5 bg-[#FAF8F2]">
            <div
              onClick={() => toggleSection("requirements")}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h4 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-neutral-800" />
                Discovery Requirements Matrix ({blueprint?.requirements?.length || 0})
              </h4>
              {expandedSections.requirements ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {expandedSections.requirements && (
              <div className="mt-4 space-y-3">
                {(blueprint?.requirements || []).map((req) => (
                  <div key={req?.id || Math.random().toString()} className="bg-white border border-[#E5DFD4] p-4 rounded-xl flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold font-mono text-neutral-800 bg-[#FAF8F2] px-2 py-0.5 rounded border border-[#E5DFD4]">
                          {req?.id || "REQ"}
                        </span>
                        <h5 className="font-bold text-neutral-900">{req?.title || "Untitled Requirement"}</h5>
                        {getCategoryBadge(req?.category || "KNOWN")}
                      </div>
                      <p className="text-neutral-600 leading-relaxed">{req?.description || "No description."}</p>
                    </div>

                    {req?.explainability && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedExplainability(req.explainability)}
                        className="border-[#E5DFD4] text-[11px] font-bold rounded-full gap-1 text-neutral-700 shrink-0"
                      >
                        <Info className="h-3 w-3 text-neutral-600" /> Explainability
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Target Users & Roles */}
          <div className="border border-[#E5DFD4] rounded-2xl p-5 bg-[#FAF8F2]">
            <div
              onClick={() => toggleSection("roles")}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h4 className="font-extrabold text-sm text-neutral-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-neutral-800" />
                User Roles & RBAC Matrix
              </h4>
              {expandedSections.roles ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {expandedSections.roles && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {(blueprint?.userRoles || []).map((ur, idx) => (
                  <div key={idx} className="bg-white border border-[#E5DFD4] p-4 rounded-xl space-y-2">
                    <span className="font-black text-neutral-900 block">{ur?.role || "User"}</span>
                    <p className="text-[#6B7280] text-[11px]">{ur?.description || "No description."}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(ur?.permissions || []).map((p, pIdx) => (
                        <Badge key={pIdx} variant="outline" className="text-[9px] font-mono bg-[#FAF8F2]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Explainability Dialog */}
      <Dialog open={!!selectedExplainability} onOpenChange={() => setSelectedExplainability(null)}>
        <DialogContent className="rounded-2xl max-w-lg border-[#E5DFD4] font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Info className="h-5 w-5 text-neutral-800" />
              AI Requirement Explainability Breakdown
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transparent rationale for AI-inferred requirements and architectural decisions.
            </DialogDescription>
          </DialogHeader>

          {selectedExplainability && (
            <div className="space-y-3 text-xs pt-2">
              <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl space-y-1">
                <span className="font-bold text-neutral-900">WHY THIS RECOMMENDATION:</span>
                <p className="text-neutral-700">{selectedExplainability.why}</p>
              </div>

              <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl space-y-1">
                <span className="font-bold text-neutral-900">CONTEXT & EVIDENCE USED:</span>
                <p className="text-neutral-700">{selectedExplainability.contextUsed}</p>
                <p className="text-neutral-500 text-[11px] italic">Evidence: {selectedExplainability.evidence}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl space-y-1">
                  <span className="font-bold text-neutral-900">ASSUMPTIONS:</span>
                  <p className="text-neutral-700">{selectedExplainability.assumptions}</p>
                </div>
                <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl space-y-1">
                  <span className="font-bold text-neutral-900">ALTERNATIVES:</span>
                  <p className="text-neutral-700">{selectedExplainability.alternatives}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-neutral-700">AI Confidence Score:</span>
                <Badge className="bg-emerald-100 text-emerald-900 border-none font-bold">
                  {Math.round(selectedExplainability.confidence * 100)}% CONFIDENCE
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
