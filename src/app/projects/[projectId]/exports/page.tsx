"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, FileSpreadsheet, Code, FileCode, Layers, Database, Table, ArrowLeft, CheckCircle2, Loader2, Sparkles, Printer } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface DeliverableItem {
  id: string
  type: string
  title: string
  updatedAt: string
}

interface RuntimeModule {
  key: string
  name: string
  recordCount?: number
}

const DELIVERABLE_CATALOG = [
  { type: "WEBSITE_SPEC", name: "Website & Landing Page Spec", icon: Layers, formats: ["json", "md", "html", "docx"] },
  { type: "SYSTEM_SPEC", name: "System Architecture & Modules", icon: Database, formats: ["json", "md", "html", "docx", "xlsx"] },
  { type: "BPMN_PROCESS", name: "BPMN Process Maps", icon: FileText, formats: ["json", "md", "html", "docx"] },
  { type: "UX_WIREFRAMES", name: "UX Wireframes & UI Spec", icon: Layers, formats: ["json", "md", "html", "docx"] },
  { type: "ERD_SCHEMA", name: "Database ERD & Data Schema", icon: Database, formats: ["json", "md", "html", "docx"] },
  { type: "API_SPEC", name: "REST API & OpenAPI Specification", icon: Code, formats: ["json", "md", "html", "docx"] },
  { type: "ROADMAP", name: "Transformation Roadmap & Timeline", icon: FileText, formats: ["json", "md", "html", "docx"] },
  { type: "BUSINESS_ANALYSIS", name: "Business Analysis & Maturity Scorecard", icon: FileText, formats: ["json", "md", "html", "docx"] },
  { type: "DISCOVERY", name: "Discovery Q&A & Intake Summary", icon: FileText, formats: ["json", "md", "html", "docx"] },
  { type: "RECOMMENDATIONS", name: "AI Recommendations & Solutions", icon: Sparkles, formats: ["json", "md", "html", "docx"] }
]

export default function ProjectExportsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState<boolean>(true)
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([])
  const [modules, setModules] = useState<RuntimeModule[]>([])
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()
      if (res.ok) {
        setDeliverables(data.deliverables || [])
        if (data.systemSpec?.modules) {
          setModules(data.systemSpec.modules)
        }
      }
    } catch (error) {
      console.error("Failed to load export center data:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId, fetchData])

  const triggerDownload = (url: string, filename: string, key: string) => {
    setDownloadingFormat(key)
    toast.info(`Preparing ${filename}...`)

    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setTimeout(() => {
      setDownloadingFormat(null)
      toast.success(`Downloaded ${filename}`)
    }, 1000)
  }

  const handleExportMaster = (format: string) => {
    const url = `/api/projects/${projectId}/export?format=${format}&type=ALL`
    const ext = format === "docx" ? "docx" : format === "xlsx" ? "xlsx" : format === "html" ? "html" : format === "md" ? "md" : "json"
    triggerDownload(url, `Transformation-Master-Report.${ext}`, `master_${format}`)
  }

  const handleExportDeliverable = (type: string, format: string) => {
    const url = `/api/projects/${projectId}/export?format=${format}&type=${type}`
    triggerDownload(url, `${type.toLowerCase()}.${format}`, `${type}_${format}`)
  }

  const handleExportCsv = (moduleKey: string) => {
    const url = `/api/projects/${projectId}/export?format=csv&module=${moduleKey}`
    triggerDownload(url, `${moduleKey}.csv`, `csv_${moduleKey}`)
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href={`/projects/${projectId}`} className="hover:text-indigo-600 flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project Dashboard</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Export Center</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <Download className="w-6 h-6 text-indigo-600" />
            <span>Enterprise Export Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compile, preview, and export transformation blueprints, architecture specs, and live runtime data packages.
          </p>
        </div>
      </div>

      {/* SECTION 1: Transformation Master Report Compiler */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-md">
        <CardHeader className="py-4 px-6 border-b border-indigo-800/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <CardTitle className="text-lg font-bold text-white">
                  Transformation Master Report Compiler
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-indigo-200">
                Compile all 10 project deliverables into a unified enterprise publication package.
              </CardDescription>
            </div>
            <Badge className="bg-indigo-500/30 text-indigo-300 border-indigo-400/30 text-xs">
              Complete Deliverable Bundle
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Generate and download a comprehensive transformation binder combining business discovery, architecture specifications, process maps, database schema, API specs, and roadmap.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => handleExportMaster("html")}
              disabled={downloadingFormat === "master_html"}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 gap-1.5"
            >
              {downloadingFormat === "master_html" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 text-emerald-400" />}
              <span>Printable HTML / PDF</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportMaster("docx")}
              disabled={downloadingFormat === "master_docx"}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 gap-1.5"
            >
              {downloadingFormat === "master_docx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-blue-400" />}
              <span>Word (.docx)</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportMaster("xlsx")}
              disabled={downloadingFormat === "master_xlsx"}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 gap-1.5"
            >
              {downloadingFormat === "master_xlsx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
              <span>Excel (.xlsx)</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportMaster("md")}
              disabled={downloadingFormat === "master_md"}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 gap-1.5"
            >
              {downloadingFormat === "master_md" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4 text-purple-400" />}
              <span>Markdown (.md)</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => handleExportMaster("json")}
              disabled={downloadingFormat === "master_json"}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 gap-1.5"
            >
              {downloadingFormat === "master_json" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4 text-amber-400" />}
              <span>JSON Archive</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Individual Deliverable Asset Exporters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Deliverable Asset Package Exporters</span>
          </h2>
          <span className="text-xs text-slate-500">10 Core Deliverables Available</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading deliverables catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DELIVERABLE_CATALOG.map((item) => {
              const IconComp = item.icon
              const exists = deliverables.some((d) => d.type === item.type)

              return (
                <Card key={item.type} className="border shadow-xs hover:border-slate-300 transition-colors">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-slate-50/50">
                    <div className="flex items-center space-x-2">
                      <IconComp className="w-4 h-4 text-indigo-600" />
                      <CardTitle className="text-xs font-semibold text-slate-900">{item.name}</CardTitle>
                    </div>

                    {exists ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-slate-400">
                        Draft
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Supported Formats:</span>
                      <div className="flex items-center space-x-1 uppercase text-[10px] font-mono">
                        {item.formats.map((f) => (
                          <Badge key={f} variant="secondary" className="px-1 py-0 text-[9px]">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 pt-1">
                      {item.formats.map((fmt) => {
                        const key = `${item.type}_${fmt}`
                        const isDownloading = downloadingFormat === key

                        return (
                          <Button
                            key={fmt}
                            variant="outline"
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => handleExportDeliverable(item.type, fmt)}
                            className="h-7 text-[11px] px-2 uppercase font-mono gap-1 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            <span>{fmt}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: System Runtime Data Exporters */}
      {modules.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Working System Runtime Data Package Exporters</span>
            </h2>
            <span className="text-xs text-slate-500">CSV & Excel Exporters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => {
              const key = `csv_${mod.key}`
              const isDownloading = downloadingFormat === key

              return (
                <Card key={mod.key} className="border shadow-xs">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b">
                    <span className="font-semibold text-xs text-slate-900">{mod.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {mod.key}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Export database records</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDownloading}
                      onClick={() => handleExportCsv(mod.key)}
                      className="h-7 text-xs gap-1 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>Export CSV</span>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
