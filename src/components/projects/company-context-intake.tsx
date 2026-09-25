"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Globe,
  Loader2,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Presentation,
  FileCode,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  BUSINESS_OBJECTIVE_OPTIONS,
  COMPANY_ROLE_OPTIONS,
  COMPANY_SIZE_OPTIONS,
  CURRENT_TOOL_OPTIONS,
} from "@/lib/company-context"
import { MAX_DOCUMENTS_PER_PROJECT, MAX_DOCUMENT_SIZE } from "@/lib/intake/constants"

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".pdf")) return <FileText className="h-4 w-4 text-rose-600" />
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv"))
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
  if (lower.endsWith(".pptx")) return <Presentation className="h-4 w-4 text-amber-600" />
  if (lower.endsWith(".md") || lower.endsWith(".txt")) return <FileCode className="h-4 w-4 text-sky-600" />
  return <FileText className="h-4 w-4 text-neutral-600" />
}

export function CompanyContextIntake({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [companyName, setCompanyName] = useState("")
  const [website, setWebsite] = useState("")
  const [industry, setIndustry] = useState("")
  const [companySize, setCompanySize] = useState("")
  const [role, setRole] = useState("")
  const [customRole, setCustomRole] = useState("")
  const [tools, setTools] = useState<string[]>([])
  const [customTool, setCustomTool] = useState("")
  const [objective, setObjective] = useState("")
  const [objectiveClarification, setObjectiveClarification] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [language, setLanguage] = useState("en")
  const [submitting, setSubmitting] = useState(false)
  const [processingStage, setProcessingStage] = useState<{ step: number; title: string; detail: string } | null>(null)

  function toggleTool(tool: string) {
    setTools((current) => (current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool]))
  }

  function addCustomTool() {
    const value = customTool.trim()
    if (value && !tools.includes(value)) setTools((current) => [...current, value])
    setCustomTool("")
  }

  function handleFilesSelected(incomingFiles: FileList | File[]) {
    const fileArray = Array.from(incomingFiles)
    const validFiles: File[] = []
    const existingKeys = new Set(selectedFiles.map((f) => `${f.name}:${f.size}`))

    for (const file of fileArray) {
      const key = `${file.name}:${file.size}`
      if (existingKeys.has(key)) {
        toast.info(`"${file.name}" is already in your upload queue.`)
        continue
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        toast.error(`"${file.name}" exceeds the 10MB limit.`)
        continue
      }
      existingKeys.add(key)
      validFiles.push(file)
    }

    const combined = [...selectedFiles, ...validFiles]
    if (combined.length > MAX_DOCUMENTS_PER_PROJECT) {
      toast.warning(
        `Maximum limit is ${MAX_DOCUMENTS_PER_PROJECT} documents. First ${MAX_DOCUMENTS_PER_PROJECT} files retained.`,
      )
      setSelectedFiles(combined.slice(0, MAX_DOCUMENTS_PER_PROJECT))
    } else {
      setSelectedFiles(combined)
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const resolvedRole = role === "Other" ? customRole.trim() : role
    if (!companyName.trim() || !industry.trim() || !companySize || !resolvedRole || !objective || tools.length === 0) {
      toast.error("Complete the company context fields before starting discovery.")
      return
    }
    if (role === "Other" && !customRole.trim()) {
      toast.error("Enter your custom role in the company.")
      return
    }
    if (objective === "Other" && !objectiveClarification.trim()) {
      toast.error("Add a short clarification for your business objective.")
      return
    }

    setSubmitting(true)
    setProcessingStage({ step: 1, title: "Understanding your business", detail: "Creating your project context..." })

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          language,
          intakeUrl: website.trim() || undefined,
          hasDocument: selectedFiles.length > 0,
          companyContext: {
            companyName: companyName.trim(),
            companyWebsite: website.trim(),
            industry: industry.trim(),
            companySize,
            userRole: resolvedRole,
            currentTools: tools,
            businessObjective: objective === "Other" ? `Other: ${objectiveClarification.trim()}` : objective,
            objectiveClarification: objectiveClarification.trim(),
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload.project?.id) throw new Error(payload.error || "Unable to create the project context.")
      const projectId = payload.project.id as string

      const ingestionWarnings: string[] = []

      // Step 2: Website ingestion
      if (website.trim()) {
        setProcessingStage({ step: 2, title: "Reading company website", detail: `Extracting public context from ${website}...` })
        try {
          const urlResponse = await fetch("/api/intake/url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, url: website.trim() }),
          })
          const urlPayload = await urlResponse.json().catch(() => ({}))
          if (!urlResponse.ok) {
            const warning = urlPayload.error || "The website could not be read."
            ingestionWarnings.push(`Website: ${warning}`)
          }
        } catch {
          ingestionWarnings.push("Website: The website could not be reached.")
        }
      }

      // Step 3: Multi-document upload and processing
      if (selectedFiles.length > 0) {
        setProcessingStage({
          step: 3,
          title: "Processing supporting documents",
          detail: `Extracting and normalizing evidence from ${selectedFiles.length} document(s)...`,
        })

        const formData = new FormData()
        selectedFiles.forEach((file) => formData.append("files", file))

        try {
          const docResponse = await fetch(`/api/projects/${projectId}/documents`, {
            method: "POST",
            body: formData,
          })
          const docPayload = await docResponse.json().catch(() => ({}))
          if (!docResponse.ok) {
            const warning = docPayload.error || "Document processing had issues."
            ingestionWarnings.push(warning)
            toast.warning(`Documents: ${warning}`)
          } else if (docPayload.results) {
            const readyCount = docPayload.readyCount ?? docPayload.results.filter((r: { success: boolean }) => r.success).length
            const totalCount = docPayload.totalCount ?? docPayload.results.length
            if (readyCount < totalCount) {
              ingestionWarnings.push(`${readyCount} of ${totalCount} documents processed successfully.`)
            }
          }
        } catch {
          ingestionWarnings.push("Some documents could not be uploaded.")
        }
      }

      // Step 4: Cross-document discovery prep
      setProcessingStage({
        step: 4,
        title: "Cross-document analysis",
        detail: "Synthesizing evidence, finding gaps, and building business discovery...",
      })

      // Brief moment for stage transition
      await new Promise((resolve) => setTimeout(resolve, 600))

      setProcessingStage({
        step: 5,
        title: "Opening Business Discovery",
        detail: "Launching INTELLY Discovery with your business evidence...",
      })

      if (ingestionWarnings.length > 0) {
        toast.warning("Project created. Discovery will proceed with all available evidence.")
      } else {
        toast.success("Business evidence processed successfully! INTELLY Discovery is ready.")
      }

      router.push(`/projects/${projectId}/discovery`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start INTELLY Discovery.")
      setProcessingStage(null)
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl font-sans space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={submitting}
          className="text-xs font-bold text-neutral-700 gap-1.5 rounded-full hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Options
        </Button>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400">
          INTELLY BUSINESS DISCOVERY
        </span>
      </div>

      <div className="mb-2 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Tell us about your business</h1>
        <p className="text-xs text-neutral-500 mt-2 max-w-2xl leading-relaxed">
          Provide business context and supporting documents. INTELLY will treat your documents as real business evidence
          to uncover processes, gaps, and root causes before recommending solutions.
        </p>
      </div>

      {submitting && processingStage && (
        <Card className="border-[#18181C] bg-[#FAF8F2] rounded-[24px] shadow-sm p-6 animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-neutral-900 animate-spin" />
              <div>
                <h4 className="text-sm font-extrabold text-neutral-900">{processingStage.title}</h4>
                <p className="text-xs text-neutral-600 mt-0.5">{processingStage.detail}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
              <div className={`p-2.5 rounded-xl border ${processingStage.step >= 1 ? "bg-white border-emerald-300 text-emerald-800 font-bold" : "bg-neutral-100 text-neutral-400"}`}>
                ✓ Business details
              </div>
              <div className={`p-2.5 rounded-xl border ${processingStage.step >= 3 ? "bg-white border-emerald-300 text-emerald-800 font-bold" : processingStage.step === 2 ? "bg-white border-amber-300 text-amber-800 font-bold" : "bg-neutral-100 text-neutral-400"}`}>
                {processingStage.step >= 3 ? "✓ Evidence extracted" : "● Reading inputs..."}
              </div>
              <div className={`p-2.5 rounded-xl border ${processingStage.step >= 4 ? "bg-white border-emerald-300 text-emerald-800 font-bold" : "bg-neutral-100 text-neutral-400"}`}>
                {processingStage.step >= 4 ? "✓ Cross-doc synthesis" : "○ Cross-doc synthesis"}
              </div>
              <div className={`p-2.5 rounded-xl border ${processingStage.step >= 5 ? "bg-white border-emerald-300 text-emerald-800 font-bold" : "bg-neutral-100 text-neutral-400"}`}>
                {processingStage.step >= 5 ? "✓ Launching Discovery" : "○ Launching Discovery"}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="shadow-sm border-[#E5DFD4] bg-white rounded-[26px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-neutral-900">Company context & evidence</CardTitle>
          <CardDescription className="text-xs">
            Start with what is known. Upload up to {MAX_DOCUMENTS_PER_PROJECT} documents for cross-document discovery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Logistics, Global Health Care"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://your-company.com"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
                <p className="text-[11px] text-neutral-400">Optional when supporting documents are provided.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Retail, Healthcare, Logistics, Manufacturing, Fintech"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Your Role in the Company</Label>
                <Select value={role} onValueChange={setRole} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {role === "Other" && (
                  <Input
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Enter your role"
                    className="mt-2"
                    disabled={submitting}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>Primary Business Objective</Label>
                <Select value={objective} onValueChange={setObjective} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an objective" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_OBJECTIVE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {objective === "Other" && (
                  <Input
                    value={objectiveClarification}
                    onChange={(e) => setObjectiveClarification(e.target.value)}
                    placeholder="Briefly describe the objective"
                    className="mt-2"
                    disabled={submitting}
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Current Tools & Systems</Label>
              <div className="flex flex-wrap gap-2">
                {CURRENT_TOOL_OPTIONS.map((tool) => (
                  <button
                    type="button"
                    key={tool}
                    onClick={() => toggleTool(tool)}
                    disabled={submitting}
                    className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                      tools.includes(tool)
                        ? "border-[#18181C] bg-[#18181C] text-white"
                        : "border-[#E5DFD4] bg-[#FAF8F2] text-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 max-w-md">
                <Input
                  value={customTool}
                  onChange={(e) => setCustomTool(e.target.value)}
                  placeholder="Add another tool or system"
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomTool}
                  disabled={submitting}
                  className="rounded-full border-[#E5DFD4]"
                >
                  Add
                </Button>
              </div>
              {tools.length > 0 && <p className="text-[11px] text-neutral-500">Selected: {tools.join(", ")}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="objectiveClarification">
                  Objective clarification <span className="font-normal text-neutral-400">(optional)</span>
                </Label>
                <Input
                  id="objectiveClarification"
                  value={objectiveClarification}
                  onChange={(e) => setObjectiveClarification(e.target.value)}
                  placeholder="Add a little context without writing a full business description"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Output language</Label>
                <Select value={language} onValueChange={setLanguage} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="gu">Gujarati</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* MULTI-DOCUMENT EVIDENCE UPLOAD AREA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-neutral-900">
                    Add supporting documents <span className="font-normal text-neutral-500">(optional)</span>
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Upload documents that help us understand your business processes, systems, and metrics.
                  </p>
                </div>
                <Badge variant="outline" className="border-[#E5DFD4] text-[10px] font-bold">
                  {selectedFiles.length}/{MAX_DOCUMENTS_PER_PROJECT} documents
                </Badge>
              </div>

              <div
                className="border-2 border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-6 rounded-2xl text-center space-y-3 hover:border-neutral-400 transition-colors"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  if (event.dataTransfer.files) handleFilesSelected(event.dataTransfer.files)
                }}
              >
                <UploadCloud className="h-8 w-8 text-neutral-400 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-neutral-800">
                    Drag & drop multiple files, or click to browse
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Supported: PDF, DOCX, TXT, MD, CSV, XLSX, XLS, PPTX (up to 10MB per file, 20 documents maximum)
                  </p>
                </div>

                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(event) => {
                    if (event.target.files) handleFilesSelected(event.target.files)
                    if (event.target) event.target.value = ""
                  }}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/csv"
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || selectedFiles.length >= MAX_DOCUMENTS_PER_PROJECT}
                  className="border-[#E5DFD4] bg-white text-xs font-bold rounded-full gap-2 shadow-sm"
                >
                  + Add Documents
                </Button>
              </div>

              {/* SCROLLABLE QUEUE OF SELECTED DOCUMENTS */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
                    <span>Uploaded documents ({selectedFiles.length})</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-neutral-400 hover:text-red-600 text-[11px]"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 rounded-2xl border border-[#E5DFD4] p-2 bg-[#FAF8F2]">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={`${file.name}-${file.size}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5DFD4] text-xs hover:border-neutral-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-[#FAF8F2] border border-[#E5DFD4] shrink-0">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-neutral-900 truncate max-w-sm">{file.name}</p>
                            <p className="text-[11px] text-neutral-500">
                              {file.name.split(".").pop()?.toUpperCase()} · {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                            Ready for analysis
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={submitting}
                            onClick={() => removeFile(idx)}
                            className="h-7 w-7 text-neutral-400 hover:text-red-600 rounded-full"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-[#E5DFD4] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FAF8F2] p-4 rounded-2xl">
              <div className="text-xs text-neutral-500">
                <p className="font-bold text-neutral-800">Production Business Analysis Pipeline</p>
                <p>INTELLY will synthesize your business details and all supporting documents into traceable evidence.</p>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="w-full sm:w-auto text-xs font-bold px-7 h-11 bg-[#18181C] hover:bg-neutral-800 text-white rounded-full shadow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing pipeline...
                  </>
                ) : (
                  <>
                    Start AI Discovery <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
