"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { SiteRenderer } from "@/components/website/site-renderer"
import { ConfigStore } from "@/lib/config-engine/config-store"
import { AIRequestRouter } from "@/lib/ai/request-router"
import { ChangeSetValidator } from "@/lib/changeset/changeset-validator"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Play,
  Rocket,
  ShieldCheck,
  Layers,
  Palette,
  Sliders,
  Type,
  ArrowLeft,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  X
} from "lucide-react"
import { toast } from "sonner"

export default function VisualEditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [spec, setSpec] = useState<WebsiteSpecData | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string>("hero")
  const [configStore, setConfigStore] = useState<ConfigStore | null>(null)

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [lastRouteResult, setLastRouteResult] = useState<any>(null)

  // Versioning & History
  const [history, setHistory] = useState<WebsiteSpecData[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [versionNumber, setVersionNumber] = useState(1)

  // Deploy Preview state
  const [deployingPreview, setDeployingPreview] = useState(false)

  // Publish & Get Link state
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Load project website spec
  useEffect(() => {
    async function loadProjectSpec() {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        const data = await res.json()

        let initialSpec: WebsiteSpecData
        if (data.deliverables && data.deliverables.length > 0) {
          const webDel = data.deliverables.find((d: any) => d.type === "WEBSITE_SPEC")
          if (webDel && webDel.versions && webDel.versions.length > 0) {
            initialSpec = webDel.versions[0].content
          } else {
            initialSpec = data.spec || data.websiteSpec
          }
        } else {
          initialSpec = data.spec || data.websiteSpec
        }

        if (!initialSpec) {
          // Fallback to clinic template baseline
          const { buildWebsiteSpecFromTemplate } = await import("@/lib/templates/template-registry")
          initialSpec = buildWebsiteSpecFromTemplate("clinic", data.name || "My Business")
        }

        const store = new ConfigStore(projectId, data.templateId || "clinic", initialSpec)
        setConfigStore(store)
        setSpec(store.getWebsiteSpec())
        setHistory([store.getWebsiteSpec()])
        setHistoryIdx(0)
      } catch (err) {
        console.warn("Failed to load project spec from API, building fallback clinic spec:", err)
        const { buildWebsiteSpecFromTemplate } = await import("@/lib/templates/template-registry")
        const fallbackSpec = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
        const store = new ConfigStore(projectId, "clinic", fallbackSpec)
        setConfigStore(store)
        setSpec(fallbackSpec)
        setHistory([fallbackSpec])
        setHistoryIdx(0)
      } finally {
        setLoading(false)
      }
    }
    loadProjectSpec()
  }, [projectId])

  const pushState = (newSpec: WebsiteSpecData) => {
    const updated = JSON.parse(JSON.stringify(newSpec))
    setSpec(updated)
    const newHist = history.slice(0, historyIdx + 1)
    newHist.push(updated)
    setHistory(newHist)
    setHistoryIdx(newHist.length - 1)
  }

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1]
      setHistoryIdx(historyIdx - 1)
      setSpec(JSON.parse(JSON.stringify(prev)))
      toast.info("Undo applied")
    }
  }

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1]
      setHistoryIdx(historyIdx + 1)
      setSpec(JSON.parse(JSON.stringify(next)))
      toast.info("Redo applied")
    }
  }

  // Visual Editor Updates
  const handleUpdateBusinessName = (name: string) => {
    if (!configStore || !spec) return
    const updated = configStore.updateBusiness({ name })
    pushState(updated)
  }

  const handleUpdatePrimaryColor = (color: string) => {
    if (!configStore || !spec) return
    const updated = configStore.updateTheme({ primary: color })
    pushState(updated)
  }

  const handleToggleSectionVisibility = (secId: string) => {
    if (!configStore || !spec) return
    const updated = configStore.toggleSection(secId)
    pushState(updated)
  }

  const handleMoveSection = (secId: string, direction: "up" | "down") => {
    if (!configStore || !spec) return
    const ids = spec.sections.map(s => s.id).filter((id): id is string => Boolean(id))
    const idx = ids.indexOf(secId)
    if (idx === -1) return
    if (direction === "up" && idx > 0) {
      const tmp = ids[idx]
      ids[idx] = ids[idx - 1]
      ids[idx - 1] = tmp
    } else if (direction === "down" && idx < ids.length - 1) {
      const tmp = ids[idx]
      ids[idx] = ids[idx + 1]
      ids[idx + 1] = tmp
    }
    const updated = configStore.reorderSections(ids)
    pushState(updated)
  }

  const handleUpdateSectionContent = (secId: string, key: string, val: any) => {
    if (!configStore || !spec) return
    const updated = configStore.updateSectionContent(secId, { [key]: val })
    pushState(updated)
  }

  // AI Request Router Customization
  const handleRunAiRequest = async () => {
    if (!aiPrompt.trim() || !spec || !configStore) return
    setAiLoading(true)
    try {
      const router = new AIRequestRouter()
      const routeRes = await router.routeRequest(aiPrompt, spec)
      setLastRouteResult(routeRes)

      // Validate ChangeSet
      const validation = ChangeSetValidator.validate(routeRes.changeSet, spec)
      if (!validation.valid) {
        toast.error(`ChangeSet validation failed: ${validation.errors.join("; ")}`)
        return
      }

      // Apply ChangeSet operations into ConfigStore
      routeRes.changeSet.operations.forEach(op => {
        switch (op.type) {
          case "UPDATE_BUSINESS":
            configStore.updateBusiness(op.payload)
            break
          case "UPDATE_THEME":
            configStore.updateTheme(op.payload)
            break
          case "UPDATE_NAVIGATION":
            if (op.payload.items) configStore.updateNavigation(op.payload.items)
            break
          case "TOGGLE_SECTION":
            if (op.targetId) configStore.toggleSection(op.targetId, op.payload.visible)
            break
          case "UPDATE_CONTENT":
            if (op.targetId) configStore.updateSectionContent(op.targetId, op.payload)
            break
        }
      })

      pushState(configStore.getWebsiteSpec())
      toast.success(
        `Applied customization! (Level ${routeRes.level}, ${routeRes.llmCallsMade} LLM calls)`
      )
      setAiPrompt("")
    } catch (err: any) {
      toast.error(err.message || "Failed to process AI customization")
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveVersion = async () => {
    if (!spec) return
    const nextVer = versionNumber + 1
    setVersionNumber(nextVer)
    toast.success(`Saved website version v${nextVer}!`)
  }

  const handleDeployPreview = async () => {
    if (!spec) return
    setDeployingPreview(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec })
      })
      if (!res.ok) throw new Error("Preview generation failed")
      const html = await res.text()
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      toast.success("Preview opened in a new tab!")
    } catch (err: any) {
      toast.error(err.message || "Failed to open preview")
    } finally {
      setDeployingPreview(false)
    }
  }

  const handlePublishAndGetLink = async () => {
    if (!spec) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/publish-spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Publish failed")
      const siteUrl = data.url || `${window.location.origin}/site/${data.slug}`
      setPublishedUrl(siteUrl)
      setShowPublishModal(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to publish site")
    } finally {
      setPublishing(false)
    }
  }

  const selectedSection = useMemo(() => {
    return spec?.sections.find(s => s.id === selectedSectionId)
  }, [spec, selectedSectionId])

  if (loading || !spec) {
    return (
      <div className="min-h-screen bg-[#F7F4EB] text-neutral-900 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-700" />
        <span className="text-sm font-medium text-neutral-700">Loading Visual Editor...</span>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#F7F4EB] text-neutral-900 flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-[#E5DFD4] bg-white px-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/projects")}
            className="text-neutral-500 hover:text-neutral-900 hover:bg-[#F7F4EB] p-2 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 font-extrabold text-sm text-neutral-900">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span>Visual Editor</span>
          </div>
          <Badge className="border-[#E5DFD4] text-neutral-600 bg-[#FAF8F2] text-xs font-bold border rounded-full">
            v{versionNumber}
          </Badge>
        </div>

        {/* Device Viewport Selector */}
        <div className="flex items-center gap-1 bg-[#FAF8F2] p-1 rounded-full border border-[#E5DFD4]">
          <Button
            variant={device === "desktop" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDevice("desktop")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-full font-bold ${
              device === "desktop" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </Button>
          <Button
            variant={device === "tablet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDevice("tablet")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-full font-bold ${
              device === "tablet" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Tablet className="w-3.5 h-3.5" /> Tablet
          </Button>
          <Button
            variant={device === "mobile" ? "default" : "ghost"}
            size="sm"
            onClick={() => setDevice("mobile")}
            className={`h-7 px-3 text-xs gap-1.5 rounded-full font-bold ${
              device === "mobile" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </Button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="h-8 px-2 text-neutral-400 hover:text-neutral-900 hover:bg-[#F7F4EB] rounded-full"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="h-8 px-2 text-neutral-400 hover:text-neutral-900 hover:bg-[#F7F4EB] rounded-full"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveVersion}
            className="h-8 text-xs border-[#E5DFD4] text-neutral-700 hover:bg-[#FAF8F2] gap-1.5 rounded-full font-bold"
          >
            <Save className="w-3.5 h-3.5" /> Save v{versionNumber + 1}
          </Button>

          <Button
            size="sm"
            onClick={handleDeployPreview}
            disabled={deployingPreview}
            className="h-8 text-xs border border-[#E5DFD4] text-neutral-700 hover:bg-[#FAF8F2] gap-1.5 rounded-full font-bold disabled:opacity-60 bg-white"
          >
            {deployingPreview ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing...</>
            ) : (
              <><Rocket className="w-3.5 h-3.5" /> Preview</>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handlePublishAndGetLink}
            disabled={publishing}
            className="h-8 text-xs bg-[#18181C] hover:bg-neutral-800 text-white gap-1.5 rounded-full font-bold disabled:opacity-60"
          >
            {publishing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...</>
            ) : (
              <><Globe className="w-3.5 h-3.5" /> Publish & Get Link</>
            )}
          </Button>
        </div>
      </header>

      {/* Publish Success Modal */}
      {showPublishModal && publishedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-[#E5DFD4] shadow-2xl p-8 w-full max-w-md mx-4 space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-extrabold text-lg text-neutral-900">Site Published! 🎉</h3>
                </div>
                <p className="text-xs text-neutral-500 pl-10">Your website is live and accessible via the link below.</p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 rounded-full hover:bg-[#F7F4EB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Display */}
            <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">Your Live Site URL</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-neutral-800 break-all leading-relaxed">{publishedUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(publishedUrl)
                    toast.success("Link copied to clipboard!")
                  }}
                  className="flex-1 h-8 text-xs bg-[#18181C] hover:bg-neutral-800 text-white gap-1.5 rounded-full font-bold"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(publishedUrl, "_blank")}
                  variant="outline"
                  className="flex-1 h-8 text-xs border-[#E5DFD4] text-neutral-700 hover:bg-[#FAF8F2] gap-1.5 rounded-full font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Site
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Share this link with anyone. The site will update each time you publish.
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace (3-Column Layout) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Structure & Sections */}
        <aside className="w-72 border-r border-[#E5DFD4] bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-[#E5DFD4] font-extrabold text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400" /> Structure & Sections
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {spec.sections.map((sec, idx) => {
              const secId = sec.id || `section-${idx}`
              return (
                <div
                  key={secId}
                  onClick={() => setSelectedSectionId(secId)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedSectionId === secId
                      ? "bg-[#18181C] border-[#18181C] text-white font-bold shadow-sm"
                      : "bg-[#FAF8F2] border-[#E5DFD4] text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-[10px] font-mono w-4 ${
                      selectedSectionId === secId ? "text-neutral-300" : "text-neutral-400"
                    }`}>{sec.order || idx + 1}</span>
                    <span className="truncate capitalize font-semibold">{secId}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleMoveSection(secId, "up")
                      }}
                      disabled={idx === 0}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleMoveSection(secId, "down")
                      }}
                      disabled={idx === spec.sections.length - 1}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleToggleSectionVisibility(secId)
                      }}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      {sec.visible !== false ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* AI Assistant Section */}
          <div className="p-3 border-t border-[#E5DFD4] bg-[#FAF8F2] space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-neutral-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" /> AI Design Assistant
              </span>
              {lastRouteResult && (
                <Badge
                  className={`text-[10px] font-bold rounded-full border ${
                    lastRouteResult.level === 0
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                      : "border-[#E5DFD4] text-neutral-600 bg-white"
                  }`}
                >
                  Level {lastRouteResult.level}
                </Badge>
              )}
            </div>

            <Textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder='e.g., "Change name to Horizon Health", "Set primary color to teal", "Make hero text more professional"'
              className="bg-white border-[#E5DFD4] text-xs text-neutral-800 resize-none h-16 focus:ring-1 focus:ring-neutral-400 rounded-xl"
            />

            <Button
              onClick={handleRunAiRequest}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs h-8 gap-1.5 rounded-full font-bold"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Customizing...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Apply Requirement
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Center Panel: Canvas Preview */}
        <main className="flex-1 bg-[#F7F4EB] flex flex-col items-center justify-start p-6 overflow-y-auto">
          <div
            className={`transition-all duration-300 bg-white text-neutral-900 shadow-xl rounded-2xl border border-[#E5DFD4] overflow-hidden ${
              device === "desktop"
                ? "w-full max-w-5xl min-h-[750px]"
                : device === "tablet"
                ? "w-[768px] min-h-[700px]"
                : "w-[375px] min-h-[650px]"
            }`}
          >
            <SiteRenderer spec={spec} />
          </div>
        </main>

        {/* Right Panel: Property Inspector */}
        <aside className="w-80 border-l border-[#E5DFD4] bg-white flex flex-col shrink-0">
          <Tabs defaultValue="text" className="flex-1 flex flex-col">
            <TabsList className="bg-[#FAF8F2] border-b border-[#E5DFD4] rounded-none h-10 px-2 justify-start gap-1">
              <TabsTrigger value="text" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Type className="w-3.5 h-3.5" /> Text
              </TabsTrigger>
              <TabsTrigger value="theme" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Palette className="w-3.5 h-3.5" /> Theme
              </TabsTrigger>
              <TabsTrigger value="layout" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Sliders className="w-3.5 h-3.5" /> Layout
              </TabsTrigger>
            </TabsList>

            {/* Text Properties Tab */}
            <TabsContent value="text" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral-700">Business Name</label>
                <Input
                  value={spec.siteName}
                  onChange={e => handleUpdateBusinessName(e.target.value)}
                  className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              {selectedSection ? (
                <div className="space-y-4 border-t border-[#E5DFD4] pt-4">
                  <h4 className="text-xs font-extrabold text-pink-500 uppercase tracking-wider">
                    Editing: {selectedSection.id || "Section"} Section
                  </h4>

                  {(selectedSection as any).headline !== undefined && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-neutral-700">Headline</label>
                      <Input
                        value={(selectedSection as any).headline}
                        onChange={e => handleUpdateSectionContent(selectedSection.id || "", "headline", e.target.value)}
                        className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                      />
                    </div>
                  )}

                  {(selectedSection as any).subheadline !== undefined && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-neutral-700">Subheadline</label>
                      <Textarea
                        value={(selectedSection as any).subheadline}
                        onChange={e => handleUpdateSectionContent(selectedSection.id || "", "subheadline", e.target.value)}
                        className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-16 resize-none rounded-xl"
                      />
                    </div>
                  )}

                  {(selectedSection as any).title !== undefined && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-neutral-700">Section Title</label>
                      <Input
                        value={(selectedSection as any).title}
                        onChange={e => handleUpdateSectionContent(selectedSection.id || "", "title", e.target.value)}
                        className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                      />
                    </div>
                  )}

                  {(selectedSection as any).body !== undefined && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-neutral-700">Body Copy</label>
                      <Textarea
                        value={(selectedSection as any).body}
                        onChange={e => handleUpdateSectionContent(selectedSection.id || "", "body", e.target.value)}
                        className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-20 resize-none rounded-xl"
                      />
                    </div>
                  )}

                  {(selectedSection as any).ctaLabel !== undefined && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-neutral-700">CTA Label</label>
                      <Input
                        value={(selectedSection as any).ctaLabel}
                        onChange={e => handleUpdateSectionContent(selectedSection.id || "", "ctaLabel", e.target.value)}
                        className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-400 italic bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl">Select a section in the left panel to edit its content.</div>
              )}
            </TabsContent>

            {/* Theme Properties Tab */}
            <TabsContent value="theme" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral-700">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={spec.theme.primary || "#0D9488"}
                    onChange={e => handleUpdatePrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#E5DFD4] bg-white cursor-pointer"
                  />
                  <Input
                    value={spec.theme.primary || "#0D9488"}
                    onChange={e => handleUpdatePrimaryColor(e.target.value)}
                    className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-9 font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral-700">Theme Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MODERN", "CLASSIC", "BOLD"] as const).map(st => (
                    <Button
                      key={st}
                      size="sm"
                      onClick={() => {
                        if (!configStore) return
                        const updated = configStore.updateTheme({ style: st })
                        pushState(updated)
                      }}
                      className={`text-[11px] h-8 rounded-xl font-bold border transition-all ${
                        spec.theme.style === st
                          ? "bg-[#18181C] text-white border-[#18181C]"
                          : "bg-[#FAF8F2] text-neutral-700 border-[#E5DFD4] hover:border-neutral-400"
                      }`}
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-neutral-700">
              <div className="space-y-2">
                <label className="font-extrabold text-neutral-700">Text Alignment</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#E5DFD4] rounded-xl font-bold">Left</Button>
                  <Button size="sm" className="h-8 text-xs bg-[#18181C] text-white rounded-xl font-bold">Center</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#E5DFD4] rounded-xl font-bold">Right</Button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5DFD4]">
                <label className="font-extrabold text-neutral-700">Section Padding & Spacing</label>
                <Input defaultValue="py-16 px-6" className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl" />
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}
