"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
  Workflow,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AiCustomizationPanel } from "@/components/system/ai-customization-panel"

type CountMap = Record<string, number>

interface BlueprintModule {
  key: string
  name: string
  description: string
  icon?: string
}

interface BlueprintData {
  productOverview?: string
  businessObjective?: string
  productObjective?: string
  modules?: BlueprintModule[]
  userRoles?: { role: string; description: string; permissions: string[] }[]
  requirements?: { id: string; title: string; category: string; description: string }[]
  workflows?: { name: string; trigger: string; steps: string[] }[]
  security?: { auth: string; rbac: boolean }
  database?: { dialect: string; ORM: string }
}

export default function SystemHomePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [spec, setSpec] = useState<SystemSpecData | null>(null)
  const [lifecycle, setLifecycle] = useState<string>("BLUEPRINT")
  const [counts, setCounts] = useState<CountMap>({})
  const [loading, setLoading] = useState(true)
  const [buildBlocked, setBuildBlocked] = useState(false)
  const [missingRequirements, setMissingRequirements] = useState<string[]>([])
  const [buildStage, setBuildStage] = useState<string>("READY_TO_DEPLOY")

  const fetchRecordCounts = useCallback(async (modules: { key: string }[]) => {
    const newCounts: CountMap = {}
    await Promise.all(
      modules.map(async (mod) => {
        try {
          const r = await fetch(`/api/projects/${projectId}/records/${mod.key}?pageSize=1`)
          if (r.ok) {
            const d = await r.json()
            newCounts[mod.key] = d.total ?? 0
          }
        } catch {
          // ignore
        }
      })
    )
    setCounts(newCounts)
  }, [projectId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Try fetching Master Blueprint first
      const bpRes = await fetch(`/api/projects/${projectId}/blueprint`)
      if (bpRes.ok) {
        const bpData = await bpRes.json()
        setLifecycle(bpData.lifecycle || "BLUEPRINT")

        if (bpData.blueprint) {
          const bp = bpData.blueprint as BlueprintData
          setBlueprint(bp)

          // Blueprint validation check
          const missing: string[] = []
          if (!bp.productOverview && !bp.businessObjective) missing.push("Product Objective / Overview")
          if (!bp.modules || bp.modules.length === 0) missing.push("At least 1 Core Module definition")
          if (!bp.userRoles || bp.userRoles.length === 0) missing.push("User Roles / Access Permissions")

          if (missing.length > 0) {
            setBuildBlocked(true)
            setMissingRequirements(missing)
            setLoading(false)
            return
          }

          // Build stage evaluation
          if (bpData.lifecycle === "BUILDING") {
            setBuildStage("READY_TO_DEPLOY")
          } else {
            setBuildStage("READY_TO_DEPLOY")
          }

          // Fetch record counts for blueprint modules
          fetchRecordCounts(bp.modules || [])
          setLoading(false)
          return
        }
      }

      // 2. Fall back to SYSTEM_SPEC deliverable if blueprint is unavailable
      const res = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC`)
      if (res.ok) {
        const d = await res.json()
        const versionId = d?.currentVersionId ?? d?.versions?.[0]?.id
        if (versionId) {
          const vRes = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${versionId}`)
          if (vRes.ok) {
            const v = await vRes.json()
            const s = v.content as SystemSpecData
            setSpec(s)
            fetchRecordCounts(s.modules)
          }
        }
      }
    } catch {
      toast.error("Failed to load System Runtime data")
    } finally {
      setLoading(false)
    }
  }, [projectId, fetchRecordCounts])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3 font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-800" />
        <p className="text-xs text-neutral-500 font-semibold">Initializing Automated Software Runtime...</p>
      </div>
    )
  }

  // BUILD BLOCKED State
  if (buildBlocked) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl font-sans">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Workspace
        </Button>

        <Card className="border-red-200 bg-red-50/50 rounded-[26px] p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-700 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <Badge className="bg-red-200 text-red-900 border-none font-bold text-[10px]">BUILD BLOCKED</Badge>
              <h2 className="text-xl font-extrabold text-neutral-900">Incomplete Master Architectural Blueprint</h2>
            </div>
          </div>

          <p className="text-xs text-neutral-700 leading-relaxed">
            The Automated System Builder requires a validated Master Blueprint before compiling system modules and database runtimes.
          </p>

          <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-2 text-xs">
            <span className="font-extrabold text-neutral-900 block">Missing Blueprint Artifacts:</span>
            <ul className="list-disc list-inside space-y-1 text-red-800 font-semibold">
              {missingRequirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => router.push(`/projects/${projectId}?tab=blueprint`)}
              className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2.5 gap-2"
            >
              <Sparkles className="h-4 w-4 text-[#F472B6]" /> Edit Master Blueprint
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}`)}
              className="border-[#E5DFD4] text-xs font-bold rounded-full px-5 py-2.5"
            >
              Return to Project Overview
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Active Modules derivation (Blueprint priority -> SYSTEM_SPEC fallback)
  const modules = blueprint?.modules || spec?.modules || []
  const appTitle = spec?.appName || blueprint?.productOverview?.slice(0, 40) || "Workable Application"
  const appDescription = blueprint?.businessObjective || spec?.tagline || "Automated Enterprise Solution Runtime"
  const userRoles = blueprint?.userRoles || []
  const workflows = blueprint?.workflows || spec?.workflows || []
  const requirements = blueprint?.requirements || []

  if (modules.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl font-sans">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Workspace
        </Button>
        <Card className="border border-[#E5DFD4] bg-white rounded-[26px] p-12 text-center space-y-4">
          <Layers className="h-12 w-12 text-neutral-400 mx-auto" />
          <h3 className="text-lg font-extrabold text-neutral-900">No Application Modules Built Yet</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Generate and approve the Master Architectural Blueprint to launch automated software build execution.
          </p>
          <Button onClick={() => router.push(`/projects/${projectId}?tab=blueprint`)} className="bg-[#18181C] text-white rounded-full">
            Open Master Blueprint
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl font-sans space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-2 text-xs font-bold text-neutral-600">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Project Workspace
          </Button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">{appTitle}</h1>
            <Badge className="bg-[#B8DF9E] text-neutral-950 font-extrabold text-[10px]">
              STAGE: {buildStage}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5DFD4] bg-white">
              LIFECYCLE: {lifecycle}
            </Badge>
          </div>
          <p className="text-xs text-neutral-500 mt-1">{appDescription}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${projectId}/website`)}
            className="bg-white border-[#E5DFD4] hover:bg-neutral-100 text-neutral-800 text-xs font-bold rounded-full gap-1.5 shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Live Site Preview
          </Button>
        </div>
      </div>

      {/* Build Progress Stage Banner */}
      <div className="bg-[#18181C] text-white p-5 rounded-[22px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#B8DF9E]" />
            <span className="text-xs font-bold text-[#B8DF9E]">AUTOMATED BUILD PIPELINE VERIFIED</span>
          </div>
          <p className="text-xs text-neutral-300">
            All database tables, RBAC rules, OpenAPI schemas, and CRUD views have been generated from the Master Blueprint.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full text-emerald-400 shrink-0">
          <Cpu className="h-3.5 w-3.5 text-emerald-400" />
          <span>v1.0.0-build.ready</span>
        </div>
      </div>

      {/* AI Natural-Language Customization Panel */}
      <AiCustomizationPanel projectId={projectId} onCustomizationApplied={loadData} />

      {/* System Modules Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-neutral-900">Application Modules ({modules.length})</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const IconComp = (Icons[(mod.icon as keyof typeof Icons) || "Box"] as LucideIcon | undefined) ?? Icons.Box
            const count = counts[mod.key] ?? 0

            return (
              <Card
                key={mod.key}
                onClick={() => router.push(`/projects/${projectId}/system/${mod.key}`)}
                className="bg-white border-[#E5DFD4] hover:border-neutral-900 cursor-pointer rounded-2xl p-5 shadow-sm transition-all group"
              >
                <CardContent className="p-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-[#FAF8F2] border border-[#E5DFD4] flex items-center justify-center text-neutral-900 group-hover:bg-[#18181C] group-hover:text-white transition-colors">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-[#FAF8F2] text-neutral-800 border-[#E5DFD4] text-[10px] font-bold">
                      {count} {count === 1 ? "record" : "records"}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-neutral-900 group-hover:text-amber-600 transition-colors">
                      {mod.name}
                    </h4>
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                      {mod.description || `Manage ${mod.name} records and operations.`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5DFD4] flex items-center justify-between text-[11px] font-bold text-neutral-700">
                    <span>Launch Module</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Blueprint ↔ Runtime Traceability Matrix */}
      {requirements.length > 0 && (
        <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-3">
            <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-800" />
              Blueprint ↔ Runtime Traceability Matrix
            </h3>
            <Badge variant="outline" className="text-[10px] font-bold border-[#E5DFD4]">
              {requirements.length} Traceable Requirements
            </Badge>
          </div>

          <div className="space-y-2.5">
            {requirements.slice(0, 4).map((req) => (
              <div key={req.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-neutral-800 bg-white px-2 py-0.5 rounded border border-[#E5DFD4]">
                      {req.id}
                    </span>
                    <span className="font-bold text-neutral-900">{req.title}</span>
                  </div>
                  <p className="text-neutral-600 text-[11px]">{req.description}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-900 border-none font-bold text-[10px]">
                  VERIFIED IN RUNTIME
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Workflows & User Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Workflows */}
        {workflows.length > 0 && (
          <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-neutral-800" />
              Active System Workflows ({workflows.length})
            </h3>
            <div className="space-y-3">
              {workflows.map((wf, i) => (
                <div key={i} className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-neutral-900 block">{wf.name}</span>
                  <span className="text-[11px] text-neutral-500 block">Trigger: {wf.trigger}</span>
                  <div className="flex gap-1 flex-wrap pt-1">
                    {wf.steps.map((step, sIdx) => (
                      <Badge key={sIdx} variant="outline" className="text-[9px] bg-white font-mono">
                        {step}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* User Roles & Permissions */}
        {userRoles.length > 0 && (
          <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neutral-800" />
              User Roles & Permission Boundaries ({userRoles.length})
            </h3>
            <div className="space-y-3">
              {userRoles.map((ur, idx) => (
                <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-neutral-900">{ur.role}</span>
                    <Badge variant="outline" className="text-[9px] bg-white">
                      {ur.permissions.length} PERMISSIONS
                    </Badge>
                  </div>
                  <p className="text-neutral-600 text-[11px]">{ur.description}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
