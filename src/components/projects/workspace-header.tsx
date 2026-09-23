"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  const readiness = project.readinessScore || 85

  return (
    <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[28px] p-5 shadow-sm space-y-4 mb-6">
      {/* Top Bar: Navigation + Title + Quick Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/projects")}
            className="h-9 w-9 rounded-full bg-white border-[#E5DFD4] hover:bg-neutral-100 text-neutral-700 shadow-sm shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                {project.name}
              </h1>
              <Badge
                variant="outline"
                className="bg-white border-[#E5DFD4] text-neutral-800 text-xs font-bold px-2.5 py-0.5 rounded-full"
              >
                {project.industry || "General Enterprise"}
              </Badge>
              {project.lifecycle && (
                <Badge className="bg-[#FEE895] text-neutral-950 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  LIFECYCLE: {project.lifecycle}
                </Badge>
              )}
              <Badge
                className={
                  project.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full"
                    : "bg-[#FAF8F2] border border-[#E5DFD4] text-neutral-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full"
                }
              >
                {project.status}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Unified AI Solution Builder Workspace • Multi-Tenant Enterprise Spec
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          <Button
            onClick={onOpenAiCompanion}
            className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-full shadow gap-2 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
            <span>Ask AI</span>
          </Button>

          <Button
            onClick={onGenerate}
            className="bg-[#FEE895] hover:bg-amber-300 text-neutral-900 text-xs font-bold px-4 py-2 rounded-full shadow gap-2 border border-amber-300 transition-all"
          >
            <Zap className="h-3.5 w-3.5 text-neutral-900" />
            <span>Generate</span>
          </Button>

          <Button
            variant="outline"
            onClick={onShare}
            className="bg-white hover:bg-neutral-100 border-[#E5DFD4] text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-full shadow-sm gap-1.5 transition-all"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>

          <Button
            variant="outline"
            onClick={onExport}
            className="bg-white hover:bg-neutral-100 border-[#E5DFD4] text-neutral-800 text-xs font-bold px-3.5 py-2 rounded-full shadow-sm gap-1.5 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-neutral-700" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row: Transformation Readiness %, Credits, Team Members */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-1">
        {/* Readiness Metric */}
        <div className="bg-white border border-[#E5DFD4] rounded-2xl p-3.5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Transformation Readiness
            </span>
            <span className="text-xs font-extrabold text-neutral-900">{readiness}%</span>
          </div>
          <Progress value={readiness} className="h-2 bg-neutral-100" />
        </div>

        {/* Industry & Standards */}
        <div className="bg-white border border-[#E5DFD4] rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Governance Standard
            </span>
            <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              ISO / TOGAF Compliant
            </span>
          </div>
          <Badge className="bg-[#B8DF9E] text-neutral-900 text-[10px] font-bold border-none">
            Verified
          </Badge>
        </div>

        {/* Credits Metric */}
        <div className="bg-white border border-[#E5DFD4] rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Workspace Credits
            </span>
            <Link
              href="/app/billing"
              className="text-xs font-extrabold text-neutral-900 hover:underline flex items-center gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5 text-amber-600" />
              30 Credits Available
            </Link>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold border-amber-300 bg-[#FEE895]">
            Pay-Per-Gen
          </Badge>
        </div>

        {/* Team Members */}
        <div className="bg-white border border-[#E5DFD4] rounded-2xl p-3.5 shadow-sm flex items-center justify-between sm:col-span-3 lg:col-span-1">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
              Team Members
            </span>
            <span className="text-xs font-extrabold text-neutral-900 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-neutral-600" />3 Collaborators
            </span>
          </div>
          <div className="flex -space-x-2 overflow-hidden">
            <Avatar className="h-7 w-7 border-2 border-white">
              <AvatarFallback className="bg-[#F8B4D9] text-neutral-900 text-[10px] font-extrabold">
                JS
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-7 w-7 border-2 border-white">
              <AvatarFallback className="bg-[#FEE895] text-neutral-900 text-[10px] font-extrabold">
                AR
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-7 w-7 border-2 border-white">
              <AvatarFallback className="bg-[#B8DF9E] text-neutral-900 text-[10px] font-extrabold">
                SV
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  )
}
