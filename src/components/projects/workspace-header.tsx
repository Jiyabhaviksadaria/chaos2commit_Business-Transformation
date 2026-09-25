"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Share2,
  Download,
  Users,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

export interface ProjectHeaderProps {
  project: {
    id: string
    name: string
    industry?: string | null
    status: string
    lifecycle?: string
    readinessScore?: number
    digitalMaturity?: number
    aiReadiness?: number
    discoveryCompleteness?: number
  }
  onOpenAiCompanion: () => void
  onGenerate: () => void
  onShare: () => void
  onExport: () => void
}

export function WorkspaceHeader({
  project,
  onOpenAiCompanion,
  onGenerate,
  onShare,
  onExport,
}: ProjectHeaderProps) {
  const router = useRouter()
  const availableScores = [project.digitalMaturity, project.aiReadiness, project.discoveryCompleteness].filter(
    (value): value is number => typeof value === "number" && value > 0
  )
  const readiness =
    typeof project.readinessScore === "number" && project.readinessScore > 0
      ? project.readinessScore
      : availableScores.length > 0
      ? Math.round(availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length)
      : 0
  const readinessLabel =
    availableScores.length > 0 || (typeof project.readinessScore === "number" && project.readinessScore > 0)
      ? `${readiness}%`
      : "Not assessed"

  return (
    <div className="min-w-0 bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-5 sm:p-6 shadow-xs space-y-5 mb-6">
      {/* Top Bar: Navigation + Title + Quick Actions */}
      <div className="flex min-w-0 flex-col justify-between items-start gap-4 border-b border-[#E5DFD4] pb-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/projects")}
            className="shrink-0"
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 flex-wrap">
              <h1 className="max-w-full break-words text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                {project.name}
              </h1>
              <Badge variant="outline">
                {project.industry || "General Enterprise"}
              </Badge>
              {project.lifecycle && (
                <Badge variant="accent">
                  LIFECYCLE: {project.lifecycle}
                </Badge>
              )}
              <Badge variant={project.status === "ACTIVE" ? "success" : "outline"}>
                {project.status}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Unified AI Solution Builder Workspace • Multi-Tenant Enterprise Spec
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-start gap-2 sm:gap-2.5 xl:w-auto xl:justify-end">
          <Button
            variant="default"
            onClick={onOpenAiCompanion}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
            <span>Ask AI</span>
          </Button>

          <Button
            variant="accent"
            onClick={onGenerate}
          >
            <Zap className="h-3.5 w-3.5 text-neutral-900" />
            <span>Generate</span>
          </Button>

          <Button
            variant="outline"
            onClick={onShare}
          >
            <Share2 className="h-3.5 w-3.5 text-neutral-700" />
            <span>Share</span>
          </Button>

          <Button
            variant="outline"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5 text-neutral-700" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row: Transformation Readiness %, Standards, Credits, Team */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 pt-0.5">
        {/* Readiness Metric */}
        <div className="min-w-0 bg-white border border-[#E5DFD4] rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Transformation Readiness
            </span>
            <span className="text-xs font-extrabold text-neutral-900">{readinessLabel}</span>
          </div>
          <Progress value={readiness} className="h-2 bg-neutral-100 mt-2.5" />
        </div>

        {/* Industry & Standards */}
        <div className="min-w-0 bg-white border border-[#E5DFD4] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
              Governance Standard
            </span>
            <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              Not configured
            </span>
          </div>
          <Badge variant="secondary">
            Review
          </Badge>
        </div>

        {/* Credits Metric */}
        <div className="min-w-0 bg-white border border-[#E5DFD4] rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
              Workspace Credits
            </span>
            <Link
              href="/app/billing"
              className="text-xs font-extrabold text-neutral-900 hover:underline flex items-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
              View billing balance
            </Link>
          </div>
          <Badge variant="accent">
            Pay-Per-Gen
          </Badge>
        </div>

        {/* Team Members */}
        <div className="min-w-0 bg-white border border-[#E5DFD4] rounded-2xl p-4 shadow-xs flex items-center justify-between sm:col-span-2 xl:col-span-1">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
              Team Members
            </span>
            <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-neutral-600" />
              Team data unavailable
            </span>
          </div>
          <Badge variant="outline">
            Not loaded
          </Badge>
        </div>
      </div>
    </div>
  )
}
