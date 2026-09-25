"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Loader2,
  Sparkles,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getAllTemplates } from "@/lib/templates/template-registry"
import { CompanyContextIntake } from "@/components/projects/company-context-intake"

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
          <div className="bg-white border border-[#E5DFD4] hover:border-neutral-400 rounded-[24px] p-8 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group hover:bg-[#FAF8F2]">
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
                <Badge variant="outline">8 Templates</Badge>
                <Badge variant="outline">Visual Editor</Badge>
                <Badge variant="outline">Vercel & Render QA</Badge>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="default"
                size="lg"
                onClick={() => setMode("build")}
                className="w-full gap-2"
              >
                <span>Build Website</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Choice 2: ANALYZE BUSINESS */}
          <div className="bg-white border border-[#E5DFD4] hover:border-neutral-400 rounded-[24px] p-8 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group hover:bg-[#FAF8F2]">
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
                <Badge variant="outline">Multi-lingual Intake</Badge>
                <Badge variant="outline">URL & Doc Parsing</Badge>
                <Badge variant="outline">Architecture Blueprint</Badge>
              </div>
            </div>

            <div className="pt-8">
              <Button
                variant="default"
                size="lg"
                onClick={() => setMode("analyze")}
                className="w-full gap-2"
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

          <Badge variant="accent">
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
            <Card key={t.id} className="bg-white border-[#E5DFD4] hover:border-neutral-400 transition-all flex flex-col justify-between group shadow-xs rounded-[24px] hover:bg-[#FAF8F2]">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-2xl bg-[#FAF8F2] border border-[#E5DFD4]">
                    {templateIcons[t.id] || <Sparkles className="w-6 h-6 text-indigo-600" />}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
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
                  variant="default"
                  size="sm"
                  onClick={() => handleSelectTemplate(t.id)}
                  disabled={creatingTemplateId === t.id}
                  className="w-full gap-2"
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

  // 3. ANALYZE BUSINESS FLOW (STRUCTURED COMPANY INTAKE)
  return <CompanyContextIntake onBack={() => setMode("choice")} />
}
