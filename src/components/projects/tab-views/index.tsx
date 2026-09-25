"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import {
  FileText,
  Cpu,
  Database,
  Globe,
  Download,
  Sparkles,
  ExternalLink,
  Code2,
  Loader2
} from "lucide-react"
import { DiscoveryLoop } from "../discovery-loop"
import { BusinessAnalysisView } from "../business-analysis-view"
import { DeliverableSuite } from "../deliverable-suite"
import { DocumentsView } from "../documents-view"
import { StageDeliverableView } from "../stage-view"

function scoreLabel(value: number | null | undefined): string {
  return typeof value === "number" && value > 0 ? `${value}%` : "Not assessed"
}

function scoreValue(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

interface ProjectData {
  id: string
  name: string
  industry?: string | null
  status: string
  businessGoal?: string | null
  businessContext?: string | null
  language?: string | null
  digitalMaturity?: number | null
  aiReadiness?: number | null
  discoveryCompleteness?: number | null
}

interface TabProps {
  projectId: string
  project: ProjectData
  onOpenAi: () => void
  onScoreUpdate?: () => void
}

// 1. Overview
export function OverviewTabView({ projectId, project, onOpenAi, onScoreUpdate }: TabProps) {
  const router = useRouter()
  const [recalculating, setRecalculating] = useState(false)
  const [intelligence, setIntelligence] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${projectId}/context`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Context unavailable")
        return response.json() as Promise<{ context?: Record<string, unknown> }>
      })
      .then((payload) => { if (active) setIntelligence(payload.context || null) })
      .catch(() => { if (active) setIntelligence(null) })
    return () => { active = false }
  }, [projectId])

  const metadata = asRecord(intelligence?.metadata)
  const discovery = asRecord(metadata.discovery)
  const company = asRecord(metadata.companyContext)
  const understanding = asRecord(metadata.intelligence)
  const problems = Array.isArray(understanding.problems) ? understanding.problems as Array<Record<string, unknown>> : []
  const rootCauses = Array.isArray(understanding.rootCauses) ? understanding.rootCauses as Array<Record<string, unknown>> : []
  const opportunities = Array.isArray(understanding.transformationOpportunities) ? understanding.transformationOpportunities.map(String) : []
  const readiness = asRecord(metadata.readiness)
  const ready = Boolean(discovery.readyForAnalysis)
  const runDiagnostic = async () => {
    setRecalculating(true)
    try {
      await fetch(`/api/projects/${projectId}/discovery/recalculate`, { method: "POST" })
      onScoreUpdate?.()
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center justify-between">
              <span>Business Transformation Objective</span>
              <Badge variant="accent">Active Phase</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Primary strategic goal registered during intake.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#E5DFD4] text-xs font-medium text-neutral-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {project.businessGoal}
            </div>

            {project.businessContext && (
              <div>
                <h4 className="font-extrabold text-xs text-neutral-700 mb-1.5 uppercase tracking-wider">Context & Parameters</h4>
                <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#E5DFD4] text-xs font-medium text-neutral-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {project.businessContext}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900">Transformation Scores</CardTitle>
            <CardDescription className="text-xs">AI audit of organizational readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">Digital Maturity</span>
                <span className="text-neutral-900">{scoreLabel(project.digitalMaturity)}</span>
              </div>
              <Progress value={scoreValue(project.digitalMaturity)} className="h-2 bg-neutral-100" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">AI & Cloud Readiness</span>
                <span className="text-neutral-900">{scoreLabel(project.aiReadiness)}</span>
              </div>
              <Progress value={scoreValue(project.aiReadiness)} className="h-2 bg-neutral-100" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">Discovery Completeness</span>
                <span className="text-neutral-900">{scoreLabel(project.discoveryCompleteness)}</span>
              </div>
              <Progress value={scoreValue(project.discoveryCompleteness)} className="h-2 bg-neutral-100" />
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={runDiagnostic}
              disabled={recalculating}
              className="w-full gap-2 mt-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
              Run Readiness Diagnostic
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-extrabold text-neutral-900">AI transformation phase</CardTitle>
              <CardDescription className="text-xs">Company context → investigation → evidence-backed analysis → existing workflow.</CardDescription>
            </div>
            <Badge variant={ready ? "success" : "accent"}>
              {ready ? "Ready for analysis" : "Discovery in progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Business objective</p>
            <p className="mt-1 text-neutral-800">{project.businessGoal || (typeof company.businessObjective === "string" ? company.businessObjective : "Not yet defined")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Discovery progress</p>
            <p className="mt-1 text-neutral-800">{typeof discovery.progress === "number" ? `${discovery.progress}%` : "Not assessed"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Problems discovered</p>
            <p className="mt-1 text-neutral-800">{problems.length || "No validated problem yet"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Readiness</p>
            <p className="mt-1 text-neutral-800">{readiness?.overallScore === null || readiness?.overallScore === undefined ? "Insufficient information" : `${readiness.overallScore}%`}</p>
          </div>
        </CardContent>
        <CardContent className="pt-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-600">
            {rootCauses.length > 0
              ? `Top hypothesis: ${typeof rootCauses[0] === "string" ? rootCauses[0] : rootCauses[0]?.statement || "Needs validation"}`
              : opportunities.length > 0
              ? `Top opportunity: ${opportunities[0]}`
              : "INTELLY will investigate the current process and evidence before making a recommendation."}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}/${ready ? "business-analysis" : "discovery"}`)}
            className="gap-2"
          >
            {ready ? "Review Business Analysis" : "Continue AI Discovery"}
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => router.push(`/projects/${projectId}/system`)}
          className="bg-white border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[24px] cursor-pointer transition-all shadow-xs group hover:bg-[#FAF8F2]"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#B8DF9E] flex items-center justify-center text-neutral-900">
              <Cpu className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-800 transition-colors" />
          </div>
          <h3 className="font-extrabold text-sm text-neutral-900">Workable System Runtime</h3>
          <p className="text-xs text-neutral-500 mt-1">Interact with live CRUD forms and runtime database tables.</p>
        </div>

        <div
          onClick={() => router.push(`/projects/${projectId}/editor`)}
          className="bg-white border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[24px] cursor-pointer transition-all shadow-xs group hover:bg-[#FAF8F2]"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#F8B4D9] flex items-center justify-center text-neutral-900">
              <Globe className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-800 transition-colors" />
          </div>
          <h3 className="font-extrabold text-sm text-neutral-900">Build & Customize Website</h3>
          <p className="text-xs text-neutral-500 mt-1">Open visual website editor, customize sections with AI, & deploy.</p>
        </div>

        <div
          onClick={onOpenAi}
          className="bg-white border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[24px] cursor-pointer transition-all shadow-xs group hover:bg-[#FAF8F2]"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FEE895] flex items-center justify-center text-neutral-900">
              <Sparkles className="h-5 w-5 text-neutral-900" />
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-800 transition-colors" />
          </div>
          <h3 className="font-extrabold text-sm text-neutral-900">Contextual AI Copilot</h3>
          <p className="text-xs text-neutral-500 mt-1">Generate missing deliverables or query architecture specs.</p>
        </div>
      </div>
    </div>
  )
}

// 2. Discovery
export function DiscoveryTabView({ projectId, project, onScoreUpdate }: TabProps) {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5DFD4] p-5 rounded-[24px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="font-extrabold text-sm text-neutral-900">INTELLY Discovery is evidence-first</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Answer targeted questions, validate the understanding, and only then move to solution options.</p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/editor`)}
          className="gap-2 shrink-0"
        >
          <Globe className="h-3.5 w-3.5 text-[#F8B4D9]" />
          Open Website Builder
        </Button>
      </div>

      <DiscoveryLoop projectId={projectId} language={project.language} onScoreUpdate={onScoreUpdate} />
      <DocumentsView projectId={projectId} />
    </div>
  )
}

// 3. Business Analysis
export function BusinessAnalysisTabView({ projectId, project, onOpenAi, onScoreUpdate }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E5DFD4] p-5 rounded-[24px] flex items-center justify-between shadow-xs">
        <div>
          <h3 className="font-extrabold text-sm text-neutral-900">Business Analysis</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Review evidence-backed findings and continue the transformation pipeline.</p>
        </div>
        <Badge variant="accent">Evidence-backed</Badge>
      </div>
      <BusinessAnalysisView
        projectId={projectId}
        language={project.language}
        digitalMaturity={project.digitalMaturity ?? undefined}
        aiReadiness={project.aiReadiness ?? undefined}
        discoveryCompleteness={project.discoveryCompleteness ?? undefined}
        onOpenAi={onOpenAi}
        onScoreUpdate={onScoreUpdate}
      />
    </div>
  )
}

// 4. Requirements & Deliverable Suite
export function RequirementsTabView({ project, onOpenAi }: TabProps) {
  return (
    <div className="space-y-6">
      {project?.id ? (
        <DeliverableSuite projectId={project.id} onOpenAi={onOpenAi} />
      ) : (
        <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm">
          <p className="text-xs text-neutral-500">Project data not found.</p>
        </Card>
      )}
    </div>
  )
}

// 5. Solutions
export function SolutionsTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="SOLUTION_RECOMMENDATION" title="Solution Recommendations" description="Evidence-backed systems and capabilities prioritized from Business Analysis." onOpenAi={onOpenAi} />
}

// 6. Architecture
export function ArchitectureTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="ARCHITECTURE_HLD" title="Solution Architecture" description="Architecture generated from the preceding requirements and system context." onOpenAi={onOpenAi} />
}

// 7. Processes
export function ProcessesTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="PROCESS_MAP" title="Process Intelligence" description="Current and future business processes, actors, decisions, and automation opportunities." onOpenAi={onOpenAi} />
}

// 8. UX
export function UxTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="WIREFRAMES" title="UX & Wireframes" description="User journeys, screen concepts, and interface requirements from the process and architecture stages." onOpenAi={onOpenAi} />
}

// 9. Database
export function DatabaseTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="DATABASE_DESIGN" title="Database Design" description="Entities, fields, relationships, and persistence definitions generated from the system specification." onOpenAi={onOpenAi} />
}

// 10. APIs
export function ApisTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="API_DESIGN" title="API Design" description="REST contracts, authentication boundaries, request/response schemas, and versioning." onOpenAi={onOpenAi} />
}

// 11. Planning
export function PlanningTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="ESTIMATION" title="Planning & Estimation" description="Evidence-based effort, resource, cost, and delivery-risk estimates." onOpenAi={onOpenAi} />
}

// 12. Roadmap
export function RoadmapTabView({ projectId, onOpenAi }: TabProps) {
  return <StageDeliverableView projectId={projectId} type="ROADMAP" title="Transformation Roadmap" description="Sequenced phases, milestones, dependencies, and change-management outcomes." onOpenAi={onOpenAi} />
}

// 13. Build
export function BuildTabView({ projectId }: TabProps) {
  const router = useRouter()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-8 shadow-xs text-center space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-14 w-14 bg-[#F8B4D9] rounded-2xl flex items-center justify-center mx-auto text-neutral-900">
            <Globe className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-extrabold text-neutral-900">Visual Website Editor</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Customize layout sections, theme palettes, language translations, AI requests, and deploy to Vercel/Render QA.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => router.push(`/projects/${projectId}/editor`)}
          className="w-full"
        >
          Launch Visual Website Editor
        </Button>
      </Card>

      <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-8 shadow-xs text-center space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-14 w-14 bg-[#B8DF9E] rounded-2xl flex items-center justify-center mx-auto text-neutral-900">
            <Cpu className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-extrabold text-neutral-900">Workable System Runtime</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Interact with dynamic database schema modules, execute live CRUD operations, and preview published systems.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => router.push(`/projects/${projectId}/system`)}
          className="w-full"
        >
          Launch Workable System Runtime
        </Button>
      </Card>
    </div>
  )
}

interface ActivityItem {
  id: string
  action: string
  entity: string
  entityId: string
  createdAt: string
  actor?: { name?: string | null; email?: string | null } | null
}

interface VersionItem {
  id: string
  type: string
  versionNumber: number
  note?: string | null
  createdAt: string
  createdBy?: { name?: string | null; email?: string | null } | null
}

const VERSION_TYPES = ["INTAKE_ANALYSIS", "REQUIREMENTS", "SOLUTION_RECOMMENDATION", "ARCHITECTURE_HLD", "PROCESS_MAP", "WIREFRAMES", "DATABASE_DESIGN", "API_DESIGN", "ESTIMATION", "ROADMAP"]

// 14. Collaboration
export function CollaborationTabView({ projectId, onOpenAi }: TabProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${projectId}/activity?limit=30`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Activity unavailable")
        return response.json() as Promise<{ activities?: ActivityItem[] }>
      })
      .then((payload) => { if (active) setActivities(Array.isArray(payload.activities) ? payload.activities : []) })
      .catch(() => { if (active) setActivities([]) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-xs space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-neutral-900">Project Activity & Governance</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Persisted project events and approval activity for this workspace.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenAi}>
          Ask AI
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-neutral-500">No project activity has been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-bold text-neutral-900">{activity.action.replaceAll("_", " ")}</p>
                <p className="text-[11px] text-neutral-500">{activity.entity} · {new Date(activity.createdAt).toLocaleString()}</p>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">{activity.actor?.name || activity.actor?.email || "System"}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// 15. Versions
export function VersionsTabView({ projectId, onOpenAi }: TabProps) {
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    Promise.all(VERSION_TYPES.map(async (type) => {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${type}/versions`)
      if (!response.ok) return []
      const payload = await response.json().catch(() => ({})) as { versions?: Array<Omit<VersionItem, "type">> }
      return (payload.versions || []).map((version) => ({ ...version, type }))
    })).then((groups) => {
      if (active) setVersions(groups.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    }).catch(() => { if (active) setVersions([]) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId])

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-xs space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-neutral-900">Deliverable Version History</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Persisted versions across the transformation stages.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenAi}>
          Ask AI
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-neutral-500">No deliverable versions have been persisted yet.</p>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div key={version.id} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-neutral-900">{version.type} v{version.versionNumber}</span>
                  <span className="text-[11px] text-neutral-400">· {new Date(version.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-neutral-600 text-[11px]">{version.note || "Persisted deliverable version"} · {version.createdBy?.name || version.createdBy?.email || "System"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// 16. Exports
export function ExportsTabView({ projectId }: TabProps) {
  const exports = [
    { title: "Transformation Report (.docx)", type: "INTAKE_ANALYSIS", format: "docx", label: "Executive report", icon: FileText },
    { title: "OpenAPI Contract (.json)", type: "API_DESIGN", format: "json", label: "Developer contract", icon: Code2 },
    { title: "Database Design (.json)", type: "DATABASE_DESIGN", format: "json", label: "Data design", icon: Database },
  ]
  const openExport = (type: string, format: string) => {
    window.open(`/api/projects/${projectId}/export?format=${format}&type=${type}`, "_blank", "noopener,noreferrer")
  }

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-base font-extrabold text-neutral-900">Export & Documentation Center</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Download persisted transformation outputs in supported formats.</p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => openExport("ALL", "json")}
          className="gap-2 shrink-0"
        >
          <Download className="h-3.5 w-3.5" /> Export persisted specs
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {exports.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.type} className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 p-4 rounded-2xl flex flex-col justify-between space-y-3 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-neutral-800" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-neutral-900">{item.title}</h4>
                  <span className="text-[10px] text-neutral-500 font-semibold">{item.label}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openExport(item.type, item.format)}
                className="w-full bg-white gap-1.5"
              >
                <Download className="h-3 w-3" /> Download
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
