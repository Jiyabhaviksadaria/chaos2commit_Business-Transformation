"use client"

import React, { useState, useEffect } from "react"
import {
  FileText,
  Sparkles,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Code2,
  Database,
  Route,
  Zap,
  Globe,
  Sliders,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { DeliverableView } from "@/components/deliverables/deliverable-view"
import { RequirementsRenderer } from "@/components/deliverables/requirements-renderer"

interface DeliverableSuiteProps {
  projectId: string
  onOpenAi?: () => void
}


const DELIVERABLE_SPECS = [
  { type: "SYSTEM_SPEC", title: "Product & System Architecture Spec", category: "Core Spec", icon: Layers },
  { type: "REQUIREMENTS", title: "Functional & Non-Functional Reqs", category: "Requirements", icon: FileText },
  { type: "SOLUTION_RECOMMENDATION", title: "Architecture Solution Recommendation", category: "Architecture", icon: Zap },
  { type: "DATABASE_DESIGN", title: "Database Schema & Entity Spec", category: "Data Architecture", icon: Database },
  { type: "API_DESIGN", title: "API Specification & Endpoints", category: "API Design", icon: Code2 },
  { type: "ROADMAP", title: "Implementation Roadmap & Phasing", category: "Strategy", icon: Route },
  { type: "PROCESS_MAP", title: "Process Intelligence & Workflows", category: "Operations", icon: Sliders },
  { type: "GAP_ANALYSIS", title: "As-Is vs To-Be Gap Matrix", category: "Analysis", icon: CheckCircle2 },
  { type: "ESTIMATION", title: "Effort & Resource Estimation", category: "Planning", icon: Clock },
  { type: "WEBSITE_SPEC", title: "Landing Page & UX Specification", category: "Frontend", icon: Globe }
]

export function DeliverableSuite({ projectId }: DeliverableSuiteProps) {
  const [deliverablesStatus, setDeliverablesStatus] = useState<Record<string, { status: string; versionCount: number; updatedAt?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generatingType, setGeneratingType] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/export?format=json&type=ALL`)
      if (res.ok) {
        const data = await res.json()
        const statusMap: Record<string, { status: string; versionCount: number; updatedAt?: string }> = {}
        
        DELIVERABLE_SPECS.forEach(spec => {
          if (data[spec.type]) {
            statusMap[spec.type] = {
              status: "READY",
              versionCount: 1,
              updatedAt: new Date().toLocaleDateString()
            }
          } else {
            statusMap[spec.type] = {
              status: "NOT_GENERATED",
              versionCount: 0
            }
          }
        })

        setDeliverablesStatus(statusMap)
      }
    } catch {
      toast.error("Failed to load deliverable suite status")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateOne = async (type: string) => {
    setGeneratingType(type)
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      })
      if (res.ok) {
        toast.success(`Generated deliverable: ${type}`)
        await fetchStatus()
      } else {
        const err = await res.json()
        throw new Error(err.error || "Generation failed")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generating deliverable")
    } finally {
      setGeneratingType(null)
    }
  }

  const handleGenerateAll = async () => {
    setGeneratingAll(true)
    toast.info("Generating full deliverable suite sequentially...")
    try {
      for (const spec of DELIVERABLE_SPECS) {
        const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: spec.type })
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || `Could not generate ${spec.title}.`)
        }
      }
      toast.success("Transformation deliverables generated successfully.")
      await fetchStatus()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error generating suite")
    } finally {
      setGeneratingAll(false)
    }
  }

  const handleExport = (type: string, format: "docx" | "html" | "json") => {
    window.open(`/api/projects/${projectId}/export?format=${format}&type=${type}`, "_blank")
  }

  if (activeType) {
    const activeSpec = DELIVERABLE_SPECS.find(s => s.type === activeType)
    return (
      <div className="space-y-4 font-sans">
        <div className="flex items-center justify-between bg-white border border-[#E5DFD4] p-4 rounded-2xl shadow-sm">
          <Button
            variant="outline"
            onClick={() => setActiveType(null)}
            className="border-[#E5DFD4] text-xs font-bold rounded-full"
          >
            ← Back to Deliverable Suite
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExport(activeType, "docx")}
              variant="outline"
              size="sm"
              className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1"
            >
              <Download className="h-3.5 w-3.5" /> DOCX
            </Button>
            <Button
              onClick={() => handleExport(activeType, "html")}
              variant="outline"
              size="sm"
              className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1"
            >
              <Download className="h-3.5 w-3.5" /> HTML
            </Button>
            <Button
              onClick={() => handleExport(activeType, "json")}
              variant="outline"
              size="sm"
              className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1"
            >
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
          </div>
        </div>

        <DeliverableView
          projectId={projectId}
          type={activeType}
          title={activeSpec?.title || activeType}
          renderer={(content) => (
            <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-6 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {typeof content === "object" ? (
                activeType === "REQUIREMENTS" ? (
                  RequirementsRenderer(content)
                ) : (
                  JSON.stringify(content, null, 2)
                )
              ) : (
                String(content)
              )}
            </div>
          )}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <Card className="bg-white border-[#E5DFD4] rounded-[26px] shadow-sm">
        <CardHeader className="pb-4 border-b border-[#E5DFD4]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-neutral-900" />
                Enterprise Solution Deliverable Suite
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive suite of 10 AI-synthesized system specifications, requirements, and roadmaps.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export Full Suite
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl border-[#E5DFD4]">
                  <DropdownMenuItem onClick={() => handleExport("ALL", "docx")} className="text-xs font-bold">
                    Full Suite as DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("ALL", "html")} className="text-xs font-bold">
                    Full Suite as HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("ALL", "json")} className="text-xs font-bold">
                    Full Suite as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-5 py-2 gap-2"
              >
                {generatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#F472B6]" />}
                Batch Generate All Deliverables
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-700" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DELIVERABLE_SPECS.map((spec) => {
                const Icon = spec.icon
                const itemStatus = deliverablesStatus[spec.type] || { status: "NOT_GENERATED", versionCount: 0 }
                const isReady = itemStatus.status === "READY"
                const isCurrentlyGenerating = generatingType === spec.type

                return (
                  <div
                    key={spec.type}
                    className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[22px] transition-all flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-white border border-[#E5DFD4] flex items-center justify-center text-neutral-900 shadow-sm">
                          <Icon className="h-5 w-5 text-neutral-800" />
                        </div>
                        <div>
                          <Badge className="bg-white border-[#E5DFD4] text-neutral-700 text-[10px] font-bold mb-1">
                            {spec.category}
                          </Badge>
                          <h4 className="font-extrabold text-sm text-neutral-900">{spec.title}</h4>
                        </div>
                      </div>

                      <Badge className={isReady ? "bg-emerald-100 text-emerald-900 border-none font-bold" : "bg-neutral-200 text-neutral-700 border-none font-bold"}>
                        {isReady ? "READY" : "NOT GENERATED"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5DFD4]/60">
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {isReady ? `Updated: ${itemStatus.updatedAt}` : "AI Specification Available"}
                      </span>

                      <div className="flex items-center gap-2">
                        {isReady ? (
                          <Button
                            onClick={() => setActiveType(spec.type)}
                            size="sm"
                            className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> View & Edit
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleGenerateOne(spec.type)}
                            disabled={isCurrentlyGenerating}
                            size="sm"
                            className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-1"
                          >
                            {isCurrentlyGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />}
                            Generate Spec
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
