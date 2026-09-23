"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Globe,
  Mic,
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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const STARTERS = [
  "HR Consultancy", "Clinic", "Retail Store", "School / Coaching",
  "Logistics", "Restaurant", "Real Estate", "Startup (not sure)"
]

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

  // Discovery Form State
  const [idea, setIdea] = useState("")
  const [projectName] = useState("")
  const [url, setUrl] = useState("")
  const [lang, setLang] = useState("auto")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as unknown as { SpeechRecognition: any; webkitSpeechRecognition: any }).SpeechRecognition || (window as unknown as { SpeechRecognition: any; webkitSpeechRecognition: any }).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setIdea(prev => prev + " " + finalTranscript)
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onerror = (event: any) => {
        setIsRecording(false)
        console.error("Speech error", event)
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) return
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.lang = lang === "auto" ? navigator.language : lang
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleStarter = (text: string) => {
    setIdea(prev => (prev ? prev + "\n" : "") + "I am building a " + text + ".")
  }

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
    if (!idea.trim() && !url.trim() && !selectedFile) {
      toast.error("Please describe your idea, enter a URL, or attach a document.")
      return
    }

    let cleanUrl = url.trim()
    if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl
    }

    setIsSubmitting(true)

    try {
      const fallbackName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, "") + " Project" : "New Transformation Project"
      const name = projectName.trim() || (idea.substring(0, 30) || cleanUrl).replace(/[^a-zA-Z0-9 ]/g, "").trim() || fallbackName

      const resProj = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          businessGoal: idea || (selectedFile ? `Extracted from ${selectedFile.name}` : `Analyze from URL ${cleanUrl}.`),
          language: lang,
          intakeUrl: cleanUrl || undefined
        })
      })

      if (!resProj.ok) {
        const err = await resProj.json()
        throw new Error(err.error || "Failed to create project")
      }
      const project = await resProj.json()

      if (cleanUrl) {
        const resUrl = await fetch("/api/intake/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: project.id, url: cleanUrl })
        })
        if (!resUrl.ok) {
          const err = await resUrl.json()
          toast.warning("URL Import failed, but project was created: " + err.error)
        }
      }

      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        const resDoc = await fetch(`/api/projects/${project.id}/documents`, {
          method: "POST",
          body: formData
        })
        if (!resDoc.ok) {
          toast.warning("Document upload failed, but workspace was initialized.")
        }
      }

      toast.success("Workspace initialized!")
      router.push(`/projects/${project.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creating workspace")
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode("choice")}
          className="text-xs font-bold text-neutral-700 gap-1.5 rounded-full hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Options
        </Button>
      </div>

      <div className="mb-4 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Launch Transformation Workspace</h1>
        <p className="text-xs text-neutral-500 mt-1">Describe your business, provide an existing website URL, or drop a document.</p>
      </div>

      <Card className="shadow-sm border-[#E5DFD4] bg-white rounded-[26px]">
        <CardContent className="pt-6">
          <Tabs defaultValue="idea" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto bg-[#FAF8F2] border border-[#E5DFD4] rounded-2xl p-1">
              <TabsTrigger value="idea" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-[#18181C] data-[state=active]:text-white transition-all flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#F472B6]" /> Description & Idea
              </TabsTrigger>
              <TabsTrigger value="url" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-[#18181C] data-[state=active]:text-white transition-all flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-[#A3C0E4]" /> Website URL
              </TabsTrigger>
              <TabsTrigger value="document" className="py-2.5 text-xs font-bold rounded-xl data-[state=active]:bg-[#18181C] data-[state=active]:text-white transition-all flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-[#B8DF9E]" /> Document Drop
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleDiscoverySubmit}>
              <TabsContent value="idea" className="space-y-6">
                <div className="relative">
                  <Textarea
                    className="min-h-[200px] text-sm resize-none focus-visible:ring-neutral-400 font-medium p-4 pr-12 rounded-2xl bg-[#FAF8F2] border-[#E5DFD4]"
                    placeholder="Describe your business or transformation goal in any language..."
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                  />
                  {speechSupported && (
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "secondary"}
                      size="icon"
                      className="absolute bottom-4 right-4 rounded-full h-10 w-10 shadow-sm transition-all"
                      onClick={toggleRecording}
                      aria-label="Voice input"
                    >
                      <Mic className={`h-5 w-5 ${isRecording ? "animate-pulse" : ""}`} />
                    </Button>
                  )}
                </div>

                <div>
                  <p className="text-xs text-neutral-500 mb-2.5 font-bold uppercase tracking-wider">Starter templates</p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map(t => (
                      <div
                        key={t}
                        onClick={() => handleStarter(t)}
                        className="px-3 py-1.5 bg-[#FAF8F2] hover:bg-[#18181C] hover:text-white transition-all text-xs font-bold rounded-full cursor-pointer select-none border border-[#E5DFD4]"
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-6">
                 <div className="space-y-3 bg-[#FAF8F2] border border-[#E5DFD4] p-5 rounded-2xl">
                  <h3 className="text-sm font-extrabold text-neutral-900">Import Existing System URL</h3>
                  <p className="text-xs text-neutral-500">We will safely extract system structure and branding from your web domain.</p>
                  <Input
                    type="text"
                    placeholder="https://your-company.com or company.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="text-xs py-5 bg-white border-[#E5DFD4] rounded-xl"
                  />
                 </div>
              </TabsContent>

              <TabsContent value="document" className="space-y-6">
                <div className="border-2 border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-8 rounded-2xl text-center space-y-4">
                  <UploadCloud className="h-10 w-10 text-neutral-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-extrabold text-neutral-900">Drop your document specification</h4>
                    <p className="text-xs text-neutral-500 mt-1">Supports PDF, DOCX, PPTX, CSV, XLSX, TXT, MD up to 10MB.</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls,.txt,.md"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-[#E5DFD4] bg-white text-xs font-bold rounded-full"
                  >
                    Select File
                  </Button>
                  {selectedFile && (
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded-xl max-w-md mx-auto">
                      <FileText className="h-4 w-4" />
                      <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </TabsContent>

              <div className="mt-8 pt-6 border-t border-[#E5DFD4] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FAF8F2] p-4 rounded-2xl">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                   <Languages className="w-4 h-4 text-neutral-500" />
                   <Select value={lang} onValueChange={setLang}>
                    <SelectTrigger className="w-[180px] border-none bg-transparent shadow-none hover:bg-white text-xs font-bold">
                      <SelectValue placeholder="Output Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.val} value={l.val}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                   </Select>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto text-xs font-bold px-8 h-11 bg-[#18181C] hover:bg-neutral-800 text-white rounded-full"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Initializing Workspace...</>
                  ) : (
                    <>Start Discovery <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
