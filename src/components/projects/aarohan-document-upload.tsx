"use client"

import * as React from "react"
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AAROHAN_BUSINESS_ANALYSIS,
  AAROHAN_OUTPUT_LANGUAGES,
  normalizeOutputLanguage,
  type AarohanOutputLanguage,
  type AnalysisDataset,
} from "@/data/aarohan-business-analysis"

const ACCEPT = ".pdf,.docx,.txt,.md,.csv,.xlsx,.xls,.pptx"

const COPY = {
  en: {
    uploadTitle: "Upload supporting documents",
    uploadDescription: "PDF, DOCX, TXT, MD, CSV, XLSX, XLS, PPTX",
    chooseFile: "Choose a file",
    dropHint: "or drop a document here",
    outputLanguage: "Output language",
    inputLanguage: "Input language",
    documentRecognized: "Document recognized",
    generateAnalysis: "Generate Analysis",
    analysing: "Analyzing…",
    notRecognized: "This document is not recognized as the Aarohan demo dataset.",
    processing: "Extracting text and detecting the demo dataset…",
    selectedFile: "Selected file",
    illustrative: "Illustrative Business Analysis",
    illustrativeHint: "Deterministic demo dataset. No AI model analyzed your document.",
  },
  hi: {
    uploadTitle: "सहायक दस्तावेज़ अपलोड करें",
    uploadDescription: "PDF, DOCX, TXT, MD, CSV, XLSX, XLS, PPTX",
    chooseFile: "फ़ाइल चुनें",
    dropHint: "या यहाँ दस्तावेज़ छोड़ें",
    outputLanguage: "आउटपुट भाषा",
    inputLanguage: "इनपुट भाषा",
    documentRecognized: "दस्तावेज़ पहचाना गया",
    generateAnalysis: "विश्लेषण तैयार करें",
    analysing: "विश्लेषण हो रहा है…",
    notRecognized: "यह दस्तावेज़ आरोहण डेमो डेटासेट के रूप में पहचाना नहीं गया।",
    processing: "टेक्स्ट निकालकर डेमो डेटासेट पहचाना जा रहा है…",
    selectedFile: "चयनित फ़ाइल",
    illustrative: "उदाहरणात्मक व्यावसायिक विश्लेषण",
    illustrativeHint: "निर्धारित डेमो डेटासेट। आपके दस्तावेज़ का कोई AI मॉडल विश्लेषण नहीं करता।",
  },
} as const

const INPUT_LANGUAGE_LABEL = {
  en: "English",
  hi: "हिन्दी",
  gu: "ગુજરાતી",
  mixed: "Mixed",
  unknown: "Unknown",
} as const

const OUTPUT_LANGUAGE_LABEL: Record<AarohanOutputLanguage, string> = { en: "English", hi: "हिन्दी" }

type RecognitionResponse = {
  recognized: boolean
  demoCompany: string | null
  inputLanguage: keyof typeof INPUT_LANGUAGE_LABEL
  confidence?: number
  matchedSignals?: string[]
  message?: string
  analysis?: AnalysisDataset
}

type Status = "idle" | "processing" | "recognized" | "unrecognized" | "error"

export function AarohanDocumentUpload({
  projectId,
  outputLanguage,
  onOutputLanguageChange,
  onAnalysisReady,
}: {
  projectId: string
  outputLanguage: AarohanOutputLanguage
  onOutputLanguageChange: (language: AarohanOutputLanguage) => void
  onAnalysisReady: (dataset: AnalysisDataset | null) => void
}) {
  const [status, setStatus] = React.useState<Status>("idle")
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [inputLanguage, setInputLanguage] = React.useState<keyof typeof INPUT_LANGUAGE_LABEL>("unknown")
  const [message, setMessage] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState<AnalysisDataset | null>(null)
  const [analysis, setAnalysis] = React.useState<AnalysisDataset | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const copy = COPY[outputLanguage]

  // Persist the selection so a page refresh keeps the same output language.
  React.useEffect(() => {
    try {
      window.localStorage.setItem("intelly.aarohan.outputLanguage", outputLanguage)
    } catch {
      /* storage unavailable - selection stays in memory */
    }
  }, [outputLanguage])

  const recognize = async (file: File) => {
    setStatus("processing")
    setMessage(null)
    setPending(null)
    setAnalysis(null)
    onAnalysisReady(null)
    setFileName(file.name)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("outputLanguage", outputLanguage)
      const response = await fetch(`/api/projects/${projectId}/demo-document`, {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json().catch(() => ({}))) as RecognitionResponse

      if (!response.ok) {
        setStatus("error")
        setMessage((payload as { error?: string }).error || "Unable to read the document.")
        return
      }

      setInputLanguage(payload.inputLanguage ?? "unknown")
      if (!payload.recognized) {
        setStatus("unrecognized")
        setMessage(payload.message || copy.notRecognized)
        return
      }

      setStatus("recognized")
      // Re-resolve in the current output language so a language switch after
      // recognition still shows the correct localized dataset.
      setPending(AAROHAN_BUSINESS_ANALYSIS[outputLanguage])
    } catch {
      setStatus("error")
      setMessage("Unable to read the document.")
    }
  }

  const generate = () => {
    const dataset = AAROHAN_BUSINESS_ANALYSIS[outputLanguage]
    setAnalysis(dataset)
    onAnalysisReady(dataset)
  }

  const switchLanguage = (language: AarohanOutputLanguage) => {
    onOutputLanguageChange(language)
    // A recognized document re-renders in the newly selected language.
    if (status === "recognized") {
      const dataset = AAROHAN_BUSINESS_ANALYSIS[language]
      setPending(dataset)
      setAnalysis(null)
      onAnalysisReady(null)
    }
  }

  return (
    <Card className="border-[#E5DFD4] bg-white shadow-sm rounded-[26px]">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-extrabold text-neutral-900">{copy.uploadTitle}</h3>
            <p className="mt-1 text-xs text-neutral-500">{copy.uploadDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500" htmlFor="aarohan-output-language">
              {copy.outputLanguage}
            </label>
            <select
              id="aarohan-output-language"
              aria-label={copy.outputLanguage}
              data-testid="aarohan-output-select"
              value={outputLanguage}
              onChange={(event) => switchLanguage(normalizeOutputLanguage(event.target.value))}
              className="h-9 rounded-full border border-[#E5DFD4] bg-white px-3 text-xs font-bold text-neutral-800 outline-none focus:ring-2 focus:ring-neutral-300"
            >
              {AAROHAN_OUTPUT_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {OUTPUT_LANGUAGE_LABEL[language]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files?.[0]
            if (file) void recognize(file)
          }}
          className="rounded-2xl border-2 border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-6 text-center"
        >
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FEE895] text-neutral-900">
            <Upload className="h-5 w-5" />
          </div>
          <p className="mt-3 text-xs font-extrabold text-neutral-900">{copy.chooseFile}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{copy.dropHint}</p>
          <input
            ref={inputRef}
            type="file"
            aria-label={copy.chooseFile}
            data-testid="aarohan-file-input"
            accept={ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void recognize(file)
              if (event.target) event.target.value = ""
            }}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "processing"}
            variant="outline"
            className="mt-4 rounded-full border-[#E5DFD4] text-xs font-bold"
          >
            {status === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            {copy.chooseFile}
          </Button>
        </div>

        {fileName && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600">
            <FileText className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-semibold text-neutral-800">{fileName}</span>
          </div>
        )}

        {status === "processing" && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3 text-xs text-neutral-700">
            <Loader2 className="h-4 w-4 animate-spin" /> {copy.processing}
          </div>
        )}

        {status === "recognized" && (
          <div data-testid="aarohan-recognized" className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-extrabold text-emerald-900">{copy.documentRecognized}</p>
              {pending && <Badge className="border-none bg-[#FEE895] text-[10px] text-neutral-900">{pending.status}</Badge>}
            </div>
            <dl className="grid grid-cols-1 gap-2 text-[11px] text-emerald-950 sm:grid-cols-3">
              <div>
                <dt className="font-bold text-emerald-700">Company</dt>
                <dd className="font-extrabold">{pending?.company.name}</dd>
              </div>
              <div>
                <dt className="font-bold text-emerald-700">{copy.inputLanguage}</dt>
                <dd className="font-extrabold">{INPUT_LANGUAGE_LABEL[inputLanguage]}</dd>
              </div>
              <div>
                <dt className="font-bold text-emerald-700">{copy.outputLanguage}</dt>
                <dd className="font-extrabold">{OUTPUT_LANGUAGE_LABEL[outputLanguage]}</dd>
              </div>
            </dl>
            <Button
              type="button"
              onClick={generate}
              data-testid="aarohan-generate"
              className="rounded-full bg-[#18181C] text-xs font-bold text-white hover:bg-neutral-800"
            >
              <Sparkles className="h-3.5 w-3.5" /> {copy.generateAnalysis}
            </Button>
          </div>
        )}

        {(status === "unrecognized" || status === "error") && message && (
          <div role="alert" data-testid="aarohan-rejection" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
          </div>
        )}

        {analysis && (
          <div data-testid="aarohan-illustrative" className="flex items-center gap-2 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3 text-[11px] text-neutral-600">
            <Sparkles className="h-3.5 w-3.5 text-pink-500" />
            <span>
              <span className="font-extrabold text-neutral-900">{copy.illustrative}.</span> {copy.illustrativeHint}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
