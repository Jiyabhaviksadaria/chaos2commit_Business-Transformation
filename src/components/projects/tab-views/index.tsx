"use client"

import React from "react"
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
  Layout
} from "lucide-react"
import { DiscoveryView } from "../discovery-view"
import { DiscoveryLoop } from "../discovery-loop"
import { BusinessAnalysisView } from "../business-analysis-view"
import { DeliverableSuite } from "../deliverable-suite"

interface ProjectData {
  id: string
  name: string
  industry?: string | null
  status: string
  businessGoal?: string | null
  businessContext?: string | null
  digitalMaturity?: number | null
  aiReadiness?: number | null
  discoveryCompleteness?: number | null
}

interface TabProps {
  projectId: string
  project: ProjectData
  onOpenAi: () => void
}

// 1. Overview
export function OverviewTabView({ projectId, project, onOpenAi }: TabProps) {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white border-[#E5DFD4] rounded-[24px] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center justify-between">
              <span>Business Transformation Objective</span>
              <Badge className="bg-[#FEE895] text-neutral-900 font-bold border-none">Active Phase</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Primary strategic goal registered during intake.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#E5DFD4] text-xs font-medium text-neutral-800 leading-relaxed whitespace-pre-wrap">
              {project.businessGoal}
            </div>

            {project.businessContext && (
              <div>
                <h4 className="font-extrabold text-xs text-neutral-700 mb-1.5 uppercase tracking-wider">Context & Parameters</h4>
                <div className="bg-[#FAF8F2] p-4 rounded-2xl border border-[#E5DFD4] text-xs font-medium text-neutral-800 leading-relaxed whitespace-pre-wrap">
                  {project.businessContext}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-neutral-900">Transformation Scores</CardTitle>
            <CardDescription className="text-xs">AI audit of organizational readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">Digital Maturity</span>
                <span className="text-neutral-900">{project.digitalMaturity || 78}%</span>
              </div>
              <Progress value={project.digitalMaturity || 78} className="h-2 bg-neutral-100" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">AI & Cloud Readiness</span>
                <span className="text-neutral-900">{project.aiReadiness || 82}%</span>
              </div>
              <Progress value={project.aiReadiness || 82} className="h-2 bg-neutral-100" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-neutral-600">Discovery Completeness</span>
                <span className="text-neutral-900">{project.discoveryCompleteness || 90}%</span>
              </div>
              <Progress value={project.discoveryCompleteness || 90} className="h-2 bg-neutral-100" />
            </div>

            <Button onClick={onOpenAi} className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2 mt-2">
              <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
              Run Readiness Diagnostic
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div onClick={() => router.push(`/projects/${projectId}/system`)} className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[22px] cursor-pointer transition-all shadow-sm group">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#B8DF9E] flex items-center justify-center text-neutral-900">
              <Cpu className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-800 transition-colors" />
          </div>
          <h3 className="font-extrabold text-sm text-neutral-900">Workable System Runtime</h3>
          <p className="text-xs text-neutral-500 mt-1">Interact with live CRUD forms and runtime database tables.</p>
        </div>

        <div onClick={() => router.push(`/projects/${projectId}/editor`)} className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[22px] cursor-pointer transition-all shadow-sm group">
          <div className="flex justify-between items-start mb-3">
            <div className="h-10 w-10 rounded-2xl bg-[#F8B4D9] flex items-center justify-center text-neutral-900">
              <Globe className="h-5 w-5" />
            </div>
            <ExternalLink className="h-4 w-4 text-neutral-400 group-hover:text-neutral-800 transition-colors" />
          </div>
          <h3 className="font-extrabold text-sm text-neutral-900">Build & Customize Website</h3>
          <p className="text-xs text-neutral-500 mt-1">Open visual website editor, customize sections with AI, & deploy.</p>
        </div>

        <div onClick={onOpenAi} className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 p-5 rounded-[22px] cursor-pointer transition-all shadow-sm group">
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
export function DiscoveryTabView({ projectId }: TabProps) {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-[22px] flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-extrabold text-sm text-neutral-900">Ready to build your website?</h3>
          <p className="text-xs text-neutral-500">Transform your business discovery analysis into a live customizable site.</p>
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}/editor`)} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Globe className="h-3.5 w-3.5 text-[#F8B4D9]" />
          Build Website from Analysis
        </Button>
      </div>

      <DiscoveryLoop projectId={projectId} />
      <DiscoveryView projectId={projectId} />
    </div>
  )
}

// 3. Business Analysis
export function BusinessAnalysisTabView({ projectId, project, onOpenAi }: TabProps) {
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-[22px] flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-extrabold text-sm text-neutral-900">Turn Insights into a Live Website</h3>
          <p className="text-xs text-neutral-500">Generate a custom website specification matching your analyzed business requirements.</p>
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}/editor`)} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Globe className="h-3.5 w-3.5 text-[#F8B4D9]" />
          Build Website from Analysis
        </Button>
      </div>

      <BusinessAnalysisView
        projectId={projectId}
        digitalMaturity={project.digitalMaturity ?? 78}
        aiReadiness={project.aiReadiness ?? 82}
        discoveryCompleteness={project.discoveryCompleteness ?? 85}
        onOpenAi={onOpenAi}
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
export function SolutionsTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Solution Architecture Recommendations</h3>
          <p className="text-xs text-neutral-500">Evaluated technology stacks, SaaS options, and custom architecture patterns.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Re-Evaluate Matrix
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-sm text-neutral-900">Option A: Event-Driven Microservices (Recommended)</h4>
            <Badge className="bg-[#B8DF9E] text-neutral-900 font-bold text-[10px] border-none">Score: 94/100</Badge>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">Next.js 14 App Router + PostgreSQL (Prisma ORM) + Kafka Queue. High scalability, zero vendor lock-in.</p>
        </div>

        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-extrabold text-sm text-neutral-900">Option B: Off-the-Shelf SaaS Integration</h4>
            <Badge variant="outline" className="text-neutral-700 font-bold text-[10px]">Score: 78/100</Badge>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">Shopify POS Enterprise + Custom Middleware. Faster initial deployment but high recurring platform licensing fees.</p>
        </div>
      </div>
    </Card>
  )
}

// 6. Architecture
export function ArchitectureTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">High-Level & Low-Level System Architecture</h3>
          <p className="text-xs text-neutral-500">Component layout, cloud infrastructure topology, and security perimeters.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Generate Architecture Spec
        </Button>
      </div>

      <div className="bg-[#18181C] text-emerald-400 p-5 rounded-2xl font-mono text-xs overflow-x-auto space-y-2">
        <div className="text-neutral-400 font-bold">System Topology Overview</div>
        <div>[Client POS Terminals] --- (TLS 1.3) ---&gt; [Next.js App Router / Edge API Gateway]</div>
        <div className="pl-56">|</div>
        <div className="pl-56">v</div>
        <div>                             [Prisma ORM / Connection Pooler]</div>
        <div className="pl-56">|</div>
        <div className="pl-56">v</div>
        <div>                       [PostgreSQL Master DB + Read Replicas]</div>
      </div>
    </Card>
  )
}

// 7. Processes
export function ProcessesTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Process Intelligence & BPMN Flow</h3>
          <p className="text-xs text-neutral-500">Business workflow sequences, automated triggers, and decision nodes.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Draft BPMN Diagram
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { step: "Step 1", name: "POS Transaction Trigger", actor: "Cashier", detail: "Scans items and submits payment at register." },
          { step: "Step 2", name: "Real-Time Inventory Deduct", actor: "API Service", detail: "Atomic inventory check & deduct in DB." },
          { step: "Step 3", name: "Audit & Ledger Write", actor: "System Worker", detail: "Writes activity log and credit ledger item." }
        ].map((s, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-extrabold bg-[#FEE895] text-neutral-900 px-3 py-1 rounded-full">{s.step}</span>
              <div>
                <p className="font-bold text-neutral-900">{s.name}</p>
                <p className="text-[11px] text-neutral-500">{s.detail}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white text-neutral-700 font-bold">{s.actor}</Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 8. UX
export function UxTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">UX / UI Wireframe Architecture</h3>
          <p className="text-xs text-neutral-500">Screen hierarchy, component design tokens, and user journey specs.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Generate Wireframe Specs
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {["In-Store POS Register Screen", "Real-Time Inventory Dashboard", "Customer Checkout & Receipt Modal"].map((screen, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl text-center space-y-3">
            <div className="h-28 bg-white rounded-xl border border-dashed border-[#E5DFD4] flex items-center justify-center text-neutral-400">
              <Layout className="h-8 w-8 text-neutral-300" />
            </div>
            <p className="text-xs font-bold text-neutral-900">{screen}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 9. Database
export function DatabaseTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Database Schema & ERD Specifications</h3>
          <p className="text-xs text-neutral-500">Relational data models, foreign keys, indexes, and Prisma schema generators.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Generate Schema DDL
        </Button>
      </div>

      <div className="bg-[#18181C] text-neutral-200 p-5 rounded-2xl font-mono text-xs space-y-2 overflow-x-auto">
        <div className="text-purple-400">model Product &#123;</div>
        <div className="pl-4 text-emerald-400">id        String   @id @default(uuid())</div>
        <div className="pl-4 text-emerald-400">name      String</div>
        <div className="pl-4 text-emerald-400">sku       String   @unique</div>
        <div className="pl-4 text-emerald-400">stockQty  Int      @default(0)</div>
        <div className="pl-4 text-emerald-400">price     Decimal  @db.Decimal(10, 2)</div>
        <div className="pl-4 text-emerald-400">createdAt DateTime @default(now())</div>
        <div className="text-purple-400">&#125;</div>
      </div>
    </Card>
  )
}

// 10. APIs
export function ApisTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">API Design & OpenAPI 3.0 Specifications</h3>
          <p className="text-xs text-neutral-500">RESTful microservice endpoints, request payloads, and response schemas.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Generate OpenAPI Contract
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { method: "POST", path: "/api/v1/inventory/deduct", desc: "Atomic stock deduction during POS sale." },
          { method: "GET", path: "/api/v1/products/sync", desc: "Batch inventory sync for POS offline cache." },
          { method: "POST", path: "/api/v1/orders/checkout", desc: "Process order transaction and write receipt." }
        ].map((api, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Badge className={api.method === "POST" ? "bg-blue-100 text-blue-900 font-extrabold border-none" : "bg-emerald-100 text-emerald-900 font-extrabold border-none"}>
                {api.method}
              </Badge>
              <code className="font-bold text-neutral-900">{api.path}</code>
            </div>
            <span className="text-neutral-500 text-[11px] font-medium">{api.desc}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 11. Planning
export function PlanningTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Resource & Cost Estimation Planning</h3>
          <p className="text-xs text-neutral-500">Cloud infrastructure costs, sprint velocity estimates, and developer allocations.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Recalculate Budget
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase">Estimated Dev Sprints</span>
          <p className="text-2xl font-extrabold text-neutral-900">6 Weeks</p>
        </div>
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase">Monthly Infra Cost</span>
          <p className="text-2xl font-extrabold text-emerald-700">$240 / mo</p>
        </div>
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-neutral-500 uppercase">ROI Expectation</span>
          <p className="text-2xl font-extrabold text-blue-700">3.4x Annual</p>
        </div>
      </div>
    </Card>
  )
}

// 12. Roadmap
export function RoadmapTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Transformation Roadmap & Milestones</h3>
          <p className="text-xs text-neutral-500">Chronological rollout phases, dependency gates, and release tags.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
          Update Milestones
        </Button>
      </div>

      <div className="space-y-4">
        {[
          { phase: "Phase 1: Foundation", status: "COMPLETED", date: "Q1 2026", detail: "Database schema setup, multi-tenant RBAC, intake parsing." },
          { phase: "Phase 2: Core Microservices", status: "IN_PROGRESS", date: "Q2 2026", detail: "Inventory Sync API, POS offline sqlite sync engine." },
          { phase: "Phase 3: Store Pilot Rollout", status: "PLANNED", date: "Q3 2026", detail: "Deploy to 15 flagship retail stores for live checkout tests." }
        ].map((m, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-neutral-900">{m.phase}</span>
                <Badge className={m.status === "COMPLETED" ? "bg-emerald-100 text-emerald-900 border-none font-bold text-[10px]" : "bg-[#FEE895] text-neutral-900 border-none font-bold text-[10px]"}>
                  {m.status}
                </Badge>
              </div>
              <p className="text-neutral-500 text-[11px]">{m.detail}</p>
            </div>
            <span className="font-bold text-neutral-700 bg-white px-3 py-1 rounded-full border border-[#E5DFD4]">{m.date}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 13. Build
export function BuildTabView({ projectId }: TabProps) {
  const router = useRouter()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-8 shadow-sm text-center space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-14 w-14 bg-[#F8B4D9] rounded-full flex items-center justify-center mx-auto text-neutral-900">
            <Globe className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-extrabold text-neutral-900">Visual Website Editor</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Customize layout sections, theme palettes, language translations, AI requests, and deploy to Vercel/Render QA.
          </p>
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}/editor`)} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2">
          Launch Visual Website Editor
        </Button>
      </Card>

      <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-8 shadow-sm text-center space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-14 w-14 bg-[#B8DF9E] rounded-full flex items-center justify-center mx-auto text-neutral-900">
            <Cpu className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-extrabold text-neutral-900">Workable System Runtime</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Interact with dynamic database schema modules, execute live CRUD operations, and preview published systems.
          </p>
        </div>
        <Button onClick={() => router.push(`/projects/${projectId}/system`)} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2">
          Launch Workable System Runtime
        </Button>
      </Card>
    </div>
  )
}

// 14. Collaboration
export function CollaborationTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Team Collaboration & Governance</h3>
          <p className="text-xs text-neutral-500">Manage organization members, assign roles, and inspect approval audit logs.</p>
        </div>
        <Button variant="outline" onClick={onOpenAi} className="border-[#E5DFD4] text-xs font-bold rounded-full">
          Invite Member
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { name: "Jiya Sadaria", email: "jiya@enterprise.com", role: "ADMIN", status: "ACTIVE" },
          { name: "Alex Rivers", email: "alex.rivers@cloud.io", role: "EDITOR", status: "ACTIVE" },
          { name: "Samantha Vance", email: "s.vance@techcorp.com", role: "VIEWER", status: "PENDING" }
        ].map((mem, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-neutral-900">{mem.name}</p>
              <p className="text-[11px] text-neutral-500">{mem.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white font-bold">{mem.role}</Badge>
              <Badge className={mem.status === "ACTIVE" ? "bg-emerald-100 text-emerald-900 border-none font-bold text-[10px]" : "bg-amber-100 text-amber-900 border-none font-bold text-[10px]"}>{mem.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 15. Versions
export function VersionsTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Deliverable Version History</h3>
          <p className="text-xs text-neutral-500">Track deliverable updates, view side-by-side diffs, and restore baseline versions.</p>
        </div>
        <Button variant="outline" onClick={onOpenAi} className="border-[#E5DFD4] text-xs font-bold rounded-full">
          Create Snapshot
        </Button>
      </div>

      <div className="space-y-3">
        {[
          { version: "v2.1", date: "Today, 14:20", author: "AI Copilot", summary: "Added OpenAPI endpoints for POS inventory deduction." },
          { version: "v2.0", date: "Yesterday, 18:00", author: "Jiya Sadaria", summary: "Approved baseline system architecture & PRD." },
          { version: "v1.0", date: "Sep 20, 2026", author: "System Intake", summary: "Initial automated discovery ingestion." }
        ].map((v, idx) => (
          <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-neutral-900">{v.version}</span>
                <span className="text-[11px] text-neutral-400">• {v.date} by {v.author}</span>
              </div>
              <p className="text-neutral-600 text-[11px]">{v.summary}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-neutral-800">Compare Diff</Button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 16. Exports
export function ExportsTabView({ onOpenAi }: TabProps) {
  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-[#E5DFD4] pb-4">
        <div>
          <h3 className="text-lg font-extrabold text-neutral-900">Export & Documentation Center</h3>
          <p className="text-xs text-neutral-500">Download enterprise architecture packages in PDF, OpenAPI JSON, or Prisma DDL format.</p>
        </div>
        <Button onClick={onOpenAi} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-2">
          <Download className="h-3.5 w-3.5" />
          Export All Specs (.ZIP)
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Complete Transformation Blueprint (PDF)", type: "Executive Report", icon: FileText },
          { title: "OpenAPI 3.0 API Specification (JSON)", type: "Developer Spec", icon: Code2 },
          { title: "Database ERD & Prisma Schema (.prisma)", type: "Database DDL", icon: Database }
        ].map((item, idx) => {
          const Icon = item.icon
          return (
            <div key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-neutral-800" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-neutral-900">{item.title}</h4>
                  <span className="text-[10px] text-neutral-500 font-semibold">{item.type}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full bg-white border-[#E5DFD4] text-xs font-bold rounded-full gap-1.5">
                <Download className="h-3 w-3" /> Download
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
