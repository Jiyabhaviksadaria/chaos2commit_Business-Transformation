"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Plus,
  ArrowRight,
  Sparkles,
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
  Clock,
  CheckCircle2,
  FileCode,
  FolderKanban,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { DEMO_PROJECT_ID } from "@/lib/demo-business-data"
import { toast } from "sonner"
import type { Project } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"

export default function ProjectsDashboard() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      } else {
        const errData = await res.json().catch(() => ({}))
        if (errData.error === "No organization associated" || res.status === 400) {
          router.push("/onboarding/company")
          return
        }
        toast.error(errData.error || "Failed to load projects")
      }
    } catch {
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  const loadDemo = async () => {
    setLoadingDemo(true)
    try {
      const res = await fetch("/api/demo/load", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      toast.success("Demo project loaded!")
      router.push(`/projects/${data.data.projectId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo")
      setLoadingDemo(false)
    }
  }

  return (
    <div className="w-full min-w-0 py-6 px-4 sm:px-6 max-w-[1400px] mx-auto space-y-8 font-sans">
      {session?.user?.isDemo && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300/80 bg-[#FEE895] px-5 py-3.5 shadow-xs">
          <div>
            <p className="text-xs font-extrabold text-neutral-900">✨ You&apos;re in Demo Mode</p>
            <p className="mt-0.5 text-[11px] text-neutral-700">Explore Intelly using a preloaded NovaCart business workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${session.user.demoProjectId || DEMO_PROJECT_ID}/business-analysis`}>
              <Button size="sm" variant="default" className="text-[10px]">
                Explore Business Analysis
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })}
              className="text-[10px] border-neutral-900/20 bg-transparent text-neutral-900 hover:bg-black/5"
            >
              Exit Demo
            </Button>
          </div>
        </div>
      )}

      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            Good morning, Lead Architect
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl leading-relaxed">
            Intelly AI wishes you a productive day. You have {projects.length} active transformation projects and pending AI deliverable reviews today.
          </p>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Button
            variant="secondary"
            onClick={loadDemo}
            disabled={loadingDemo}
          >
            {loadingDemo ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
            )}
            <span>Load Demo Workspace</span>
          </Button>
          <Link href="/projects/new">
            <Button variant="default">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Signature Pastel Summary Cards (Intelly Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Yellow Card: Workspaces */}
        <div className="bg-[#FEE895] rounded-[24px] p-5 text-neutral-900 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-sm transition-all border border-amber-300/60">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-800 opacity-80">
                Projects Overview
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold tracking-tight">{projects.length} active</span>
                <span className="text-xs font-semibold text-neutral-700">2 pending</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-300/60 flex items-center justify-center">
              <Activity className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-end gap-1.5 h-10">
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[40%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[70%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[50%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[90%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[65%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[80%]" />
            <span className="ml-auto text-[10px] font-bold text-neutral-800">100% Operational</span>
          </div>
        </div>

        {/* Pink Card: Specs & Analysis */}
        <div className="bg-[#F8B4D9] rounded-[24px] p-5 text-neutral-900 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-sm transition-all border border-pink-300/60">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-800 opacity-80">
                Specs Summary
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold tracking-tight">14 Specs</span>
                <span className="text-xs font-semibold text-neutral-700">generated</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-pink-300/60 flex items-center justify-center">
              <FileCode className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-4">
            <svg className="w-full h-10 text-neutral-900 stroke-current fill-none" viewBox="0 0 100 30">
              <path d="M0 20 Q 25 5, 50 15 T 100 10" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Green Card: System Status */}
        <div className="bg-[#B8DF9E] rounded-[24px] p-5 text-neutral-900 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-sm transition-all border border-emerald-300/60">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-800 opacity-80">
                Deliverables
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold tracking-tight">100% Ready</span>
                <span className="text-xs font-semibold text-neutral-700">Verified</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-300/60 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-neutral-800">
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full text-[11px] font-bold">Intake</span>
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full text-[11px] font-bold">CRM</span>
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full text-[11px] font-bold">Website</span>
          </div>
        </div>

        {/* Blue Card: AI Processing */}
        <div className="bg-[#A3C0E4] rounded-[24px] p-5 text-neutral-900 flex flex-col justify-between shadow-xs relative overflow-hidden group hover:shadow-sm transition-all border border-blue-300/60">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-800 opacity-80">
                AI Processing
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold tracking-tight">0.4s avg</span>
                <span className="text-xs font-semibold text-neutral-700">latency</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-300/60 flex items-center justify-center">
              <Clock className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-bold text-neutral-800">
            <span>Fast Mode Enabled</span>
            <Sparkles className="h-4 w-4 text-neutral-900" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Project List (Left) + Calendar & Agenda Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Project Queue */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-neutral-900">
              Transformation Projects
            </h2>
            <span className="text-xs font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer">
              Total ({projects.length})
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-neutral-200/50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects in your workspace"
              description="Click below to auto-generate a sample project or create a brand new workspace from scratch."
              action={
                <Button variant="default" onClick={loadDemo}>
                  <Sparkles className="h-3.5 w-3.5 text-[#FEE895]" />
                  Load Sample Project
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {projects.map((project, idx) => {
                const colorAccents = [
                  "bg-[#FDE8F3] text-pink-700",
                  "bg-[#DBEAFE] text-blue-700",
                  "bg-[#FEF3C7] text-amber-700",
                  "bg-[#DCFCE7] text-emerald-700",
                ]
                const accentClass = colorAccents[idx % colorAccents.length]

                return (
                  <div
                    key={project.id}
                    className="bg-[#FAF8F2] hover:bg-white border border-[#E5DFD4] hover:border-neutral-400 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`h-10 w-10 rounded-xl ${accentClass} flex items-center justify-center font-extrabold text-sm shrink-0 border border-black/5`}>
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-neutral-900 group-hover:text-black truncate">
                          {project.name}
                        </h4>
                        <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                          {project.industry || "Enterprise Architecture"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                      <Badge variant={project.status === "ACTIVE" ? "success" : "secondary"}>
                        {project.status || "ACTIVE"}
                      </Badge>
                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm" variant="default" className="gap-1.5">
                          <span>Open</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: Calendar & Timeline Agenda Widget */}
        <div className="space-y-6">
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-5 sm:p-6 space-y-5 shadow-xs">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 bg-[#EFEAE0] px-3 py-1 rounded-full flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-neutral-600" />
                September 2026
              </span>
              <div className="flex items-center gap-1 text-neutral-600">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="p-1.5 rounded-full hover:bg-neutral-200/60 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  className="p-1.5 rounded-full hover:bg-neutral-200/60 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 gap-y-2">
              <span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span><span>SU</span>
              <span className="text-neutral-400">26</span><span className="text-neutral-400">27</span><span className="text-neutral-400">28</span><span className="text-neutral-400">29</span><span className="text-neutral-400">30</span>
              <span className="text-neutral-800">1</span><span className="text-neutral-800">2</span>
              <span className="text-neutral-800">3</span><span className="text-neutral-800">4</span><span className="text-neutral-800">5</span><span className="text-neutral-800">6</span><span className="text-neutral-800">7</span>
              <span className="text-neutral-800">8</span><span className="text-neutral-800">9</span><span className="text-neutral-800">10</span><span className="text-neutral-800">11</span><span className="text-neutral-800">12</span>
              <span className="text-neutral-800">13</span><span className="text-neutral-800">14</span>
              <span className="bg-[#F8B4D9] text-neutral-900 font-extrabold rounded-full w-6 h-6 flex items-center justify-center mx-auto">15</span>
              <span className="text-neutral-800">16</span><span className="text-neutral-800">17</span><span className="text-neutral-800">18</span><span className="text-neutral-800">19</span>
              <span className="text-neutral-800">20</span><span className="text-neutral-800">21</span>
            </div>

            <Button
              variant="default"
              onClick={loadDemo}
              className="w-full gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Quick Add Transformation Task</span>
            </Button>

            {/* Today's Agenda */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">Today&apos;s Timeline</span>
                <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">Live</span>
              </div>

              <div className="space-y-2.5">
                <div className="bg-[#FDE8F3] rounded-2xl p-3 flex items-center justify-between text-xs border border-pink-200/60">
                  <div>
                    <p className="font-extrabold text-pink-950">Intake Analysis Sync</p>
                    <p className="text-[11px] text-pink-700">09:15 AM • Automated</p>
                  </div>
                  <Badge variant="outline" className="border-pink-300 bg-white text-pink-700">
                    Completed
                  </Badge>
                </div>

                <div className="bg-[#DBEAFE] rounded-2xl p-3 flex items-center justify-between text-xs border border-blue-200/60">
                  <div>
                    <p className="font-extrabold text-blue-950">System Architecture Spec</p>
                    <p className="text-[11px] text-blue-700">11:30 AM • System Review</p>
                  </div>
                  <Badge variant="outline" className="border-blue-300 bg-white text-blue-700">
                    In Progress
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
