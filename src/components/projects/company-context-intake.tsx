"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, FileText, Globe, Loader2, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BUSINESS_OBJECTIVE_OPTIONS, COMPANY_ROLE_OPTIONS, COMPANY_SIZE_OPTIONS, CURRENT_TOOL_OPTIONS } from "@/lib/company-context"

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("en")
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState("")

  function toggleTool(tool: string) {
    setTools((current) => current.includes(tool) ? current.filter((item) => item !== tool) : [...current, tool])
  }

  function addCustomTool() {
    const value = customTool.trim()
    if (value && !tools.includes(value)) setTools((current) => [...current, value])
    setCustomTool("")
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
    setProgress("Creating your project context...")
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "analyze",
          language,
          intakeUrl: website.trim() || undefined,
          hasDocument: Boolean(selectedFile),
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
      if (website.trim()) {
        setProgress("Reading the company website...")
        try {
          const urlResponse = await fetch("/api/intake/url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, url: website.trim() }) })
          const urlPayload = await urlResponse.json().catch(() => ({}))
          if (!urlResponse.ok) {
            const warning = urlPayload.error || "The website could not be read."
            ingestionWarnings.push(`Website: ${warning}`)
            toast.warning(`Website skipped: ${warning}`)
          }
        } catch {
          const warning = "The website could not be reached."
          ingestionWarnings.push(`Website: ${warning}`)
          toast.warning(`Website skipped: ${warning}`)
        }
      }
      if (selectedFile) {
        setProgress("Reading your document...")
        try {
          const formData = new FormData()
          formData.append("file", selectedFile)
          const documentResponse = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: formData })
          const documentPayload = await documentResponse.json().catch(() => ({}))
          if (!documentResponse.ok && !(documentResponse.status === 409 && documentPayload.duplicate)) {
            const warning = documentPayload.error || "The document could not be processed."
            ingestionWarnings.push(`Document: ${warning}`)
            toast.warning(`Document skipped: ${warning}`)
          }
        } catch {
          const warning = "The document could not be uploaded."
          ingestionWarnings.push(`Document: ${warning}`)
          toast.warning(`Document skipped: ${warning}`)
        }
      }

      setProgress("Opening INTELLY Discovery...")
      if (ingestionWarnings.length > 0) {
        toast.warning("Your company context is saved. Discovery will continue with the information available.")
      } else {
        toast.success("Company context saved. INTELLY will investigate before recommending a solution.")
      }
      setSubmitting(false)
      router.push(`/projects/${projectId}/discovery`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start INTELLY Discovery.")
      setProgress("")
      setSubmitting(false)
    }
  }

  return <div className="container mx-auto py-8 px-4 max-w-5xl font-sans space-y-6">
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs font-bold text-neutral-700 gap-1.5 rounded-full hover:bg-white"><ArrowLeft className="w-4 h-4" /> Back to Options</Button>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-400">INTELLY DISCOVERY</span>
    </div>
    <div className="mb-2 text-center sm:text-left">
      <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Tell us about your company</h1>
      <p className="text-xs text-neutral-500 mt-2 max-w-2xl leading-relaxed">INTELLY will use this context to understand your business before recommending a transformation.</p>
    </div>
    <Card className="shadow-sm border-[#E5DFD4] bg-white rounded-[26px]">
      <CardHeader className="pb-3"><CardTitle className="text-base font-extrabold text-neutral-900">Company context</CardTitle><CardDescription className="text-xs">Start with what is known. INTELLY will investigate the gaps with you.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="companyName">Company Name</Label><Input id="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="e.g. ABC Retail" required /></div>
            <div className="space-y-2"><Label htmlFor="companyWebsite">Company Website</Label><div className="relative"><Globe className="absolute left-3 top-3 h-4 w-4 text-neutral-400" /><Input id="companyWebsite" type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://your-company.com" className="pl-9" /></div><p className="text-[11px] text-neutral-400">Optional when you provide a document. Public websites only.</p></div>
            <div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="e.g. Retail, healthcare, logistics" required /></div>
            <div className="space-y-2"><Label>Company Size</Label><Select value={companySize} onValueChange={setCompanySize}><SelectTrigger><SelectValue placeholder="Select company size" /></SelectTrigger><SelectContent>{COMPANY_SIZE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Your Role in the Company</Label><Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger><SelectContent>{COMPANY_ROLE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{role === "Other" && <Input value={customRole} onChange={(event) => setCustomRole(event.target.value)} placeholder="Enter your role" className="mt-2" />}</div>
            <div className="space-y-2"><Label>Primary Business Objective</Label><Select value={objective} onValueChange={setObjective}><SelectTrigger><SelectValue placeholder="Select an objective" /></SelectTrigger><SelectContent>{BUSINESS_OBJECTIVE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{objective === "Other" && <Input value={objectiveClarification} onChange={(event) => setObjectiveClarification(event.target.value)} placeholder="Briefly describe the objective" className="mt-2" />}</div>
          </div>

          <div className="space-y-3"><Label>Current Tools & Systems</Label><div className="flex flex-wrap gap-2">{CURRENT_TOOL_OPTIONS.map((tool) => <button type="button" key={tool} onClick={() => toggleTool(tool)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${tools.includes(tool) ? "border-[#18181C] bg-[#18181C] text-white" : "border-[#E5DFD4] bg-[#FAF8F2] text-neutral-700 hover:border-neutral-400"}`}>{tool}</button>)}</div><div className="flex gap-2 max-w-md"><Input value={customTool} onChange={(event) => setCustomTool(event.target.value)} placeholder="Add another tool or system" /><Button type="button" variant="outline" onClick={addCustomTool} className="rounded-full border-[#E5DFD4]">Add</Button></div>{tools.length > 0 && <p className="text-[11px] text-neutral-500">Selected: {tools.join(", ")}</p>}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="objectiveClarification">Objective clarification <span className="font-normal text-neutral-400">(optional)</span></Label><Input id="objectiveClarification" value={objectiveClarification} onChange={(event) => setObjectiveClarification(event.target.value)} placeholder="Add a little context, without writing a full business description" /></div>
            <div className="space-y-2"><Label>Output language</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem><SelectItem value="gu">Gujarati</SelectItem><SelectItem value="es">Spanish</SelectItem><SelectItem value="fr">French</SelectItem><SelectItem value="de">German</SelectItem><SelectItem value="pt">Portuguese</SelectItem><SelectItem value="ar">Arabic</SelectItem></SelectContent></Select></div>
          </div>

          <div className="border-2 border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-5 rounded-2xl text-center space-y-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setSelectedFile(event.dataTransfer.files?.[0] || null) }}><UploadCloud className="h-8 w-8 text-neutral-400 mx-auto" /><div><p className="text-sm font-extrabold text-neutral-900">Add supporting documents <span className="font-normal text-neutral-500">(optional)</span></p><p className="text-xs text-neutral-500 mt-1">PDF, DOCX, TXT, MD, CSV, XLSX, XLS, or PPTX up to 10MB.</p></div><input type="file" ref={fileInputRef} onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="hidden" accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,text/csv" /><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-[#E5DFD4] bg-white text-xs font-bold rounded-full">Select Document</Button>{selectedFile && <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 p-2 rounded-xl max-w-md mx-auto"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{selectedFile.name}</span></div>}</div>

          <div className="pt-5 border-t border-[#E5DFD4] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FAF8F2] p-4 rounded-2xl"><p className="text-xs text-neutral-500">INTELLY will investigate your process, evidence, root causes, and impact before suggesting options.</p><Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto text-xs font-bold px-7 h-11 bg-[#18181C] hover:bg-neutral-800 text-white rounded-full">{submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress || "Preparing discovery..."}</> : <>Start AI Discovery <ArrowRight className="w-4 h-4 ml-2" /></>}</Button></div>
        </form>
      </CardContent>
    </Card>
  </div>
}
