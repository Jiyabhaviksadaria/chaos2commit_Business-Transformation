"use client"

import React, { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Globe,
  Languages,
  ArrowRight,
  Loader2,
  Sparkles,
  UploadCloud,
  FileText,
  Layout,
  Search,
  ArrowLeft,
  Stethoscope,
  Briefcase,
  ShoppingBag,
  GraduationCap,
  Truck,
  Utensils,
  Building2,
  Rocket
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllTemplates } from "@/lib/templates/template-registry"

const templateIcons: Record<string, React.ReactNode> = {
  clinic: <Stethoscope className="w-6 h-6 text-teal-600" />,
  hr_consultancy: <Briefcase className="w-6 h-6 text-blue-600" />,
  retail_store: <ShoppingBag className="w-6 h-6 text-pink-600" />,
  school_coaching: <GraduationCap className="w-6 h-6 text-indigo-600" />,
  logistics: <Truck className="w-6 h-6 text-slate-800" />,
  restaurant: <Utensils className="w-6 h-6 text-red-700" />,
  real_estate: <Building2 className="w-6 h-6 text-emerald-700" />,
  startup: <Rocket className="w-6 h-6 text-indigo-500" />
}

const LANGUAGES = [
  { val: "auto", label: "Auto (same as input)" },
  { val: "en", label: "English" },
  { val: "hi", label: "Hindi" },
  { val: "gu", label: "Gujarati" },
  { val: "es", label: "Spanish" },
  { val: "fr", label: "French" },
  { val: "de", label: "German" },
  { val: "pt", label: "Portuguese" },
  { val: "ar", label: "Arabic" },
  { val: "zh", label: "Chinese" },
  { val: "ja", label: "Japanese" }
]

export default function NewProjectScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMode = searchParams?.get("mode") || "choice"
  const [mode, setMode] = useState<"choice" | "build" | "analyze">(
    initialMode === "build" ? "build" : initialMode === "analyze" ? "analyze" : "choice"
  )

  // Template State
  const templates = getAllTemplates()
  const [creatingTemplateId, setCreatingTemplateId] = useState<string | null>(null)

  // Discovery Form State. Intake accepts only a website URL and/or documents.
  const [url, setUrl] = useState("")
  const [lang, setLang] = useState("auto")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle Template Selection for BUILD WEBSITE
  const handleSelectTemplate = async (templateId: string) => {
    setCreatingTemplateId(templateId)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          name: `${templateId.replace(/_/g, " ").toUpperCase()} Project`,
          businessGoal: `Build website using ${templateId} template baseline`
        })
      })

      const data = await res.json()
      if (!res.ok || !data.project?.id) {
        throw new Error(data.error || "Failed to initialize project")
      }

      toast.success("Starter template loaded successfully!")
      router.push(`/projects/${data.project.id}/editor`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not load template")
      setCreatingTemplateId(null)
    }
  }

  // Handle Discovery Form Submit for ANALYZE BUSINESS
  const handleDiscoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUrl = url.trim()
    if (!cleanUrl && !selectedFile) {
      toast.error("Please provide a website URL or upload a document.")
      return
    }

    setIsSubmitting(true)
    setProgress("Creating project workspace...")

    try {
      const resProj = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          language: lang === "auto" ? undefined : lang,
          intakeUrl: cleanUrl || undefined,
          hasDocument: Boolean(selectedFile),
        })
      })
      const projectPayload = await resProj.json().catch(() => ({}))
      if (!resProj.ok || !projectPayload.project?.id) throw new Error(projectPayload.error || "Failed to create project")
      const project = projectPayload.project

      if (cleanUrl) {
        setProgress("Extracting website content...")
        const resUrl = await fetch("/api/intake/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, url: cleanUrl }) })
        const urlPayload = await resUrl.json().catch(() => ({}))
        if (!resUrl.ok) throw new Error(urlPayload.error || "Unable to extract content from this website. Try uploading a document instead.")
      }

      if (selectedFile) {
        setProgress("Extracting document content...")
        const formData = new FormData()
        formData.append("file", selectedFile)
        const resDoc = await fetch(`/api/projects/${project.id}/documents`, { method: "POST", body: formData })
        const docPayload = await resDoc.json().catch(() => ({}))
        if (!resDoc.ok && !(resDoc.status === 409 && docPayload.duplicate)) throw new Error(docPayload.error || "Unable to process the uploaded document.")
      }

      setProgress("Analyzing business...")
      const resAnalysis = await fetch(`/api/projects/${project.id}/deliverables/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "INTAKE_ANALYSIS", language: lang === "auto" ? "en" : lang }) })
      const analysisPayload = await resAnalysis.json().catch(() => ({}))
      if (!resAnalysis.ok) throw new Error(analysisPayload.error || "Business analysis could not be generated. Check the AI provider configuration and retry.")
      toast.success("Discovery complete. Your business analysis is ready.")
      router.push(`/projects/${project.id}?tab=business-analysis`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to start discovery. Please try again.")
      setProgress("")
      setIsSubmitting(false)
    }
  }

  // 1. PRIMARY CHOICE SCREEN
  if (mode === "choice") {
    return (
      <div className="container mx-auto py-10 px-4 max-w-5xl font-sans">
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Create Project
          </h1>
          <p className="text-sm text-neutral-500 max-w-xl mx-auto">
            Choose how you want to start building your digital transformation product.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Choice 1: BUILD WEBSITE */}
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-[#F8B4D9] text-neutral-900 flex items-center justify-center">
                <Layout className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 group-hover:text-black">
                BUILD WEBSITE
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Start from a business starter template and create a production-ready website. Customize it visually or using AI, preview it, and deploy it.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">8 Templates</Badge>
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">Visual Editor</Badge>
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">Vercel & Render QA</Badge>
              </div>
            </div>

            <div className="pt-8">
              <Button
                onClick={() => setMode("build")}
                className="w-full bg-[#18181C] hover:bg-neutral-800 text-white font-bold text-xs h-11 rounded-full gap-2 shadow"
              >
                <span>Build Website</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Choice 2: ANALYZE BUSINESS */}
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] hover:border-neutral-400 rounded-[28px] p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-[#FEE895] text-neutral-900 flex items-center justify-center">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold text-neutral-900 group-hover:text-black">
                ANALYZE BUSINESS
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Analyze your business requirements, understand the business, identify opportunities, and generate structured insights before building.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">Multi-lingual Intake</Badge>
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">URL & Doc Parsing</Badge>
                <Badge variant="outline" className="bg-white border-[#E5DFD4] text-[10px] font-bold text-neutral-700">Architecture Blueprint</Badge>
              </div>
            </div>

            <div className="pt-8">
              <Button
                onClick={() => setMode("analyze")}
                className="w-full bg-[#18181C] hover:bg-neutral-800 text-white font-bold text-xs h-11 rounded-full gap-2 shadow"
              >
                <span>Analyze Business</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. BUILD WEBSITE FLOW (STARTER TEMPLATES GRID)
  if (mode === "build") {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl font-sans space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("choice")}
            className="text-xs font-bold text-neutral-700 gap-1.5 rounded-full hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Options
          </Button>

          <Badge variant="outline" className="bg-[#FEE895] text-neutral-900 border-amber-300 font-extrabold text-xs px-3 py-1 rounded-full">
            Zero LLM API Baseline
          </Badge>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
            Select a Business Starter Template
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Instantly loads a deterministic, functional baseline website without calling an LLM API.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {templates.map(t => (
            <Card key={t.id} className="bg-[#FAF8F2] border-[#E5DFD4] hover:border-neutral-400 transition-all flex flex-col justify-between group shadow-sm rounded-[24px]">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-2xl bg-white border border-[#E5DFD4]">
                    {templateIcons[t.id] || <Sparkles className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase bg-white text-neutral-800 font-bold border border-[#E5DFD4]">
                    {t.theme.style}
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-neutral-900 group-hover:text-black">
                  {t.name}
                </CardTitle>
                <CardDescription className="text-xs text-neutral-500 line-clamp-2 mt-1">
                  {t.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-2">
                <div className="text-[11px] text-neutral-600">
                  <span className="font-bold text-neutral-800">Pages:</span> {t.pages.join(", ")}
                </div>
                <div className="text-[11px] text-neutral-600">
                  <span className="font-bold text-neutral-800">Key Features:</span> {t.features.join(", ")}
                </div>
              </CardContent>

              <div className="p-5 pt-2">
                <Button
                  onClick={() => handleSelectTemplate(t.id)}
                  disabled={creatingTemplateId === t.id}
                  className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full h-9 gap-2 shadow"
                >
                  {creatingTemplateId === t.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Template...
                    </>
                  ) : (
                    <>
                      Start Building <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // 3. ANALYZE BUSINESS FLOW (DISCOVERY FORM)
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl font-sans space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setMode("choice")} className="text-xs font-bold text-neutral-700 gap-1.5 rounded-full hover:bg-white"><ArrowLeft className="w-4 h-4" /> Back to Options</Button>
      </div>
      <div className="mb-4 text-center sm:text-left"><h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Launch Transformation Workspace</h1><p className="text-xs text-neutral-500 mt-1">Provide a website URL, upload business documents, or use both as the source for discovery.</p></div>
      <Card className="shadow-sm border-[#E5DFD4] bg-white rounded-[26px]"><CardContent className="pt-6">
        <form onSubmit={handleDiscoverySubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-3 bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl"><div className="flex items-center gap-2"><Globe className="w-5 h-5 text-[#A3C0E4]" /><h3 className="text-sm font-extrabold text-neutral-900">Website URL</h3></div><p className="text-xs text-neutral-500">We safely extract useful business content from a public web page.</p><Input type="url" inputMode="url" placeholder="https://your-company.com" value={url} onChange={(e) => setUrl(e.target.value)} className="text-xs py-5 bg-white border-[#E5DFD4] rounded-xl" aria-label="Website URL" /><p className="text-[11px] text-neutral-400">HTTP/HTTPS only. Private and local network addresses are blocked.</p></div>
            <div className="border-2 border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-5 rounded-2xl text-center space-y-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSelectedFile(event.dataTransfer.files?.[0] || null) }}><UploadCloud className="h-9 w-9 text-neutral-400 mx-auto" /><div><h3 className="text-sm font-extrabold text-neutral-900">Document Drop</h3><p className="text-xs text-neutral-500 mt-1">PDF, DOCX, TXT, or MD up to 10MB.</p></div><input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-[#E5DFD4] bg-white text-xs font-bold rounded-full">Select Document</Button>{selectedFile && <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded-xl max-w-md mx-auto"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span></div>}</div>
          </div>
          <div className="pt-6 border-t border-[#E5DFD4] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FAF8F2] p-4 rounded-2xl"><div className="flex items-center gap-3 w-full sm:w-auto"><Languages className="w-4 h-4 text-neutral-500" /><Select value={lang} onValueChange={setLang}><SelectTrigger className="w-[180px] border-none bg-transparent shadow-none hover:bg-white text-xs font-bold"><SelectValue placeholder="Output Language" /></SelectTrigger><SelectContent>{LANGUAGES.map(l => <SelectItem key={l.val} value={l.val}>{l.label}</SelectItem>)}</SelectContent></Select></div><Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto text-xs font-bold px-8 h-11 bg-[#18181C] hover:bg-neutral-800 text-white rounded-full">{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress || "Starting discovery..."}</> : <>Start Discovery <ArrowRight className="w-4 h-4 ml-2" /></>}</Button></div>
        </form>
      </CardContent></Card>
    </div>
  )
}
