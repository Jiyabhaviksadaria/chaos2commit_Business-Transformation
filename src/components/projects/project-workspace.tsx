"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Project } from "@prisma/client"
import { WorkspaceHeader } from "@/components/projects/workspace-header"
import { AiCompanionDrawer } from "@/components/projects/ai-companion-drawer"
import {
  OverviewTabView,
  DiscoveryTabView,
  BusinessAnalysisTabView,
  RequirementsTabView,
  SolutionsTabView,
  ArchitectureTabView,
  ProcessesTabView,
  UxTabView,
  DatabaseTabView,
  ApisTabView,
  PlanningTabView,
  RoadmapTabView,
  BuildTabView,
  CollaborationTabView,
  VersionsTabView,
  ExportsTabView,
} from "@/components/projects/tab-views"
import { BlueprintView } from "@/components/projects/blueprint-view"

export function ProjectWorkspace({ forcedTab }: { forcedTab?: string } = {}) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = (params?.projectId as string) || ""
  const initialTab = forcedTab || (searchParams ? searchParams.get("tab") || "overview" : "overview")
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab)
  }, [forcedTab])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error("Failed to load")
      setProject(await res.json())
    } catch {
      toast.error("Failed to load project details")
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const segment = {
      overview: "",
      discovery: "/discovery",
      "business-analysis": "/business-analysis",
      requirements: "/requirements",
      blueprint: "/blueprint",
      solutions: "/solutions",
      architecture: "/architecture",
      processes: "/processes",
      ux: "/ux",
      database: "/database",
      apis: "/apis",
      planning: "/planning",
      roadmap: "/roadmap",
      build: "/build",
      collaboration: "/collaboration",
      versions: "/versions",
      exports: "/exports",
    }[value]
    router.replace(segment ? `/projects/${projectId}${segment}` : `/projects/${projectId}`, { scroll: false })
  }

  const handleGenerate = () => {
    toast.info("Open a stage below to generate its persisted artifact.")
    setAiDrawerOpen(true)
  }
  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Workspace URL copied to clipboard!")
    } else toast.info("Share workspace link with team members")
  }
  const handleExport = () => router.replace(`/projects/${projectId}/exports`, { scroll: false })

  if (loading) return <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-neutral-800" /></div>
  if (!project) return <div className="container mx-auto py-8 text-center pt-20"><h2 className="text-2xl font-bold mb-4 text-neutral-900">Project Not Found</h2><Button onClick={() => router.push("/projects")} className="bg-[#18181C] text-white rounded-full">Back to Projects</Button></div>

  return <div className="container mx-auto min-w-0 py-6 px-4 max-w-7xl font-sans bg-[#F7F4EB] min-h-screen">
    <WorkspaceHeader project={project} onOpenAiCompanion={() => setAiDrawerOpen(true)} onGenerate={handleGenerate} onShare={handleShare} onExport={handleExport} />
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4">
      <div className="overflow-x-auto pb-2 scrollbar-none bg-[#FAF8F2] border border-[#E5DFD4] rounded-[22px] p-1.5 shadow-sm"><TabsList className="min-w-max bg-transparent space-x-1 h-auto p-0">
        {[['overview','Overview'],['discovery','Discovery'],['business-analysis','Business Analysis'],['requirements','Requirements'],['blueprint','Blueprint'],['solutions','Solutions'],['architecture','Architecture'],['processes','Processes'],['ux','UX'],['database','Database'],['apis','APIs'],['planning','Planning'],['roadmap','Roadmap'],['build','Build'],['collaboration','Collaboration'],['versions','Versions'],['exports','Exports']].map(([value, label]) => <TabsTrigger key={value} value={value} className="data-[state=active]:bg-[#18181C] data-[state=active]:text-white text-xs font-extrabold rounded-full px-4 py-2 transition-all">{label}</TabsTrigger>)}
      </TabsList></div>
      <TabsContent value="overview"><OverviewTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="discovery"><DiscoveryTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} onScoreUpdate={fetchProject} /></TabsContent>
      <TabsContent value="business-analysis"><BusinessAnalysisTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} onScoreUpdate={fetchProject} /></TabsContent>
      <TabsContent value="requirements"><RequirementsTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="blueprint"><BlueprintView projectId={projectId} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="solutions"><SolutionsTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="architecture"><ArchitectureTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="processes"><ProcessesTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="ux"><UxTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="database"><DatabaseTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="apis"><ApisTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="planning"><PlanningTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="roadmap"><RoadmapTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="build"><BuildTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="collaboration"><CollaborationTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="versions"><VersionsTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
      <TabsContent value="exports"><ExportsTabView projectId={projectId} project={project} onOpenAi={() => setAiDrawerOpen(true)} /></TabsContent>
    </Tabs>
    <AiCompanionDrawer open={aiDrawerOpen} onOpenChange={setAiDrawerOpen} projectId={projectId} projectName={project.name} activeTab={activeTab} />
  </div>
}
