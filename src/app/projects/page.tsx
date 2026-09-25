"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, ArrowRight, Sparkles, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity, Clock, CheckCircle2, FileCode } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { signOut, useSession } from "next-auth/react"
import { DEMO_PROJECT_ID } from "@/lib/demo-business-data"
import { toast } from "sonner"
import type { Project } from "@prisma/client"

export default function ProjectsDashboard() {
  const t = useTranslations("Projects")
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const router = useRouter()

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch {
      toast.error(t("loadFailed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const loadDemo = async () => {
    setLoadingDemo(true)
    try {
      const res = await fetch("/api/demo/load", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      toast.success(t("demoLoaded"))
      router.push(`/projects/${data.data.projectId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("demoFailed"))
      setLoadingDemo(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 font-sans">
      {session?.user?.isDemo && <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#FEE895] bg-[#FEE895] px-4 py-3 shadow-sm"><div><p className="text-xs font-extrabold text-neutral-900">✨ {t("demoMode")}</p><p className="mt-0.5 text-[11px] text-neutral-700">{t("demoDescription")}</p></div><div className="flex gap-2"><Link href={`/projects/${session.user.demoProjectId || DEMO_PROJECT_ID}/business-analysis`} className="rounded-full bg-[#18181C] px-3 py-2 text-[10px] font-extrabold text-white">{t("exploreAnalysis")}</Link><button type="button" onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })} className="rounded-full border border-neutral-900/20 px-3 py-2 text-[10px] font-extrabold text-neutral-900">{t("exitDemo")}</button></div></div>}
      {/* Top Banner Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            {t("greeting")}
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-xl">
            {t("description", { count: projects.length })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDemo}
            disabled={loadingDemo}
            className="flex items-center gap-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm transition-all"
          >
            {loadingDemo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />}
            <span>{t("loadDemo")}</span>
          </button>
          <Link href="/projects/new">
            <button className="flex items-center gap-2 bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm transition-all">
              <Plus className="h-3.5 w-3.5" />
              <span>{t("createProject")}</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 4 Signature Pastel Summary Cards (Intelly Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Yellow Card: Workspaces */}
        <div className="bg-[#FEE895] rounded-[26px] p-5 text-neutral-900 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800 opacity-80">{t("projectsOverview")}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold">{t("active", { count: projects.length })}</span>
                <span className="text-xs font-medium text-neutral-700">{t("pending")}</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-300/60 flex items-center justify-center">
              <Activity className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-end gap-1.5 h-12">
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[40%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[70%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[50%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[90%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[65%]" />
            <div className="bg-neutral-900/80 w-3 rounded-t-sm h-[80%]" />
            <span className="ml-auto text-[10px] font-bold text-neutral-800">{t("operational")}</span>
          </div>
        </div>

        {/* Pink Card: Specs & Analysis */}
        <div className="bg-[#F8B4D9] rounded-[26px] p-5 text-neutral-900 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800 opacity-80">{t("specsSummary")}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold">{t("specsCount")}</span>
                <span className="text-xs font-medium text-neutral-700">{t("generatedLabel")}</span>
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
        <div className="bg-[#B8DF9E] rounded-[26px] p-5 text-neutral-900 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800 opacity-80">{t("deliverables")}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold">{t("readyStatus")}</span>
                <span className="text-xs font-medium text-neutral-700">{t("verified")}</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-300/60 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-neutral-800">
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full">Intake</span>
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full">CRM</span>
            <span className="bg-neutral-900/10 px-2.5 py-1 rounded-full">Website</span>
          </div>
        </div>

        {/* Blue Card: {t("aiProcessing")} */}
        <div className="bg-[#A3C0E4] rounded-[26px] p-5 text-neutral-900 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800 opacity-80">{t("aiProcessing")}</p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-extrabold">0.4s</span>
                <span className="text-xs font-medium text-neutral-700">{t("latency")}</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-300/60 flex items-center justify-center">
              <Clock className="h-4 w-4 text-neutral-800" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs font-bold text-neutral-800">
            <span>{t("fastMode")}</span>
            <Sparkles className="h-4 w-4 text-neutral-900" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Project List (Left) + Calendar & Agenda Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Project Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">{t("transformationProjects")}</h2>
            <span className="text-xs font-medium text-neutral-500 hover:text-neutral-900 cursor-pointer">{t("showAll", { count: projects.length })}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-neutral-200/50 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[26px] p-10 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-[#FEE895] text-neutral-900 flex items-center justify-center mx-auto">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">{t("emptyTitle")}</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {t("emptyDescription")}
              </p>
              <button
                onClick={loadDemo}
                className="bg-[#18181C] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow hover:bg-neutral-800 transition-all"
              >
                {t("loadSample")}
              </button>
            </div>
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
                    className="bg-[#FAF8F2] hover:bg-white border border-[#E5DFD4] hover:border-neutral-300 rounded-[22px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl ${accentClass} flex items-center justify-center font-bold text-sm shrink-0`}>
                        {project.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 group-hover:text-black">{project.name}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-1">{project.industry || t("industryDefault")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="bg-[#EFEAE0] text-neutral-700 text-[11px] font-semibold px-3 py-1 rounded-full">
                        {project.status || "ACTIVE"}
                      </span>
                      <Link href={`/projects/${project.id}`}>
                        <button className="flex items-center gap-1.5 bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all">
                          <span>{t("open")}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
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
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[28px] p-5 space-y-5 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 bg-[#EFEAE0] px-3 py-1 rounded-full flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5 text-neutral-600" />
                {t("september")}
              </span>
              <div className="flex items-center gap-1 text-neutral-600">
                <button className="p-1 rounded-full hover:bg-neutral-200/60"><ChevronLeft className="h-4 w-4" /></button>
                <button className="p-1 rounded-full hover:bg-neutral-200/60"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Calendar Grid (Reference Style) */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-neutral-400 gap-y-2">
              <span>{t("dayMon")}</span><span>{t("dayTue")}</span><span>{t("dayWed")}</span><span>{t("dayThu")}</span><span>{t("dayFri")}</span><span>{t("daySat")}</span><span>{t("daySun")}</span>
              <span className="text-neutral-400">26</span><span className="text-neutral-400">27</span><span className="text-neutral-400">28</span><span className="text-neutral-400">29</span><span className="text-neutral-400">30</span>
              <span className="text-neutral-800">1</span><span className="text-neutral-800">2</span>
              <span className="text-neutral-800">3</span><span className="text-neutral-800">4</span><span className="text-neutral-800">5</span><span className="text-neutral-800">6</span><span className="text-neutral-800">7</span>
              <span className="text-neutral-800">8</span><span className="text-neutral-800">9</span><span className="text-neutral-800">10</span><span className="text-neutral-800">11</span><span className="text-neutral-800">12</span>
              <span className="text-neutral-800">13</span><span className="text-neutral-800">14</span>
              <span className="bg-[#F8B4D9] text-neutral-900 font-extrabold rounded-full w-6 h-6 flex items-center justify-center mx-auto">15</span>
              <span className="text-neutral-800">16</span><span className="text-neutral-800">17</span><span className="text-neutral-800">18</span><span className="text-neutral-800">19</span>
              <span className="text-neutral-800">20</span><span className="text-neutral-800">21</span>
            </div>

            <button
              onClick={loadDemo}
              className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold py-2.5 rounded-full shadow transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("quickAddTask")}</span>
            </button>

            {/* Today's Agenda */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">{t("todayTimeline")}</span>
                <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-200/60 px-2 py-0.5 rounded-full">{t("live")}</span>
              </div>

              <div className="space-y-2.5">
                <div className="bg-[#FDE8F3] rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-pink-950">{t("intakeSync")}</p>
                    <p className="text-[11px] text-pink-700">{t("agendaTime1")}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-white text-pink-700 px-2 py-1 rounded-full">{t("completed")}</span>
                </div>

                <div className="bg-[#DBEAFE] rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-blue-950">{t("architectureSpec")}</p>
                    <p className="text-[11px] text-blue-700">{t("agendaTime2")}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-white text-blue-700 px-2 py-1 rounded-full">{t("inProgress")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
