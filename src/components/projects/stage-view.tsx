"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, FileJson, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface StageViewProps {
  projectId: string
  type: string
  title: string
  description: string
  onOpenAi?: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Not specified"
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value, null, 2)
}

function StructuredValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-neutral-400">No items generated yet.</span>
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-xl border border-[#E5DFD4] bg-[#FAF8F2] p-3 text-xs text-neutral-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {isRecord(item) ? (
              <div className="space-y-1">
                {Object.entries(item).map(([key, nested]) => (
                  <div key={key}>
                    <span className="font-bold text-neutral-900">{key.replace(/([A-Z])/g, " $1")}: </span>
                    {isRecord(nested) || Array.isArray(nested) ? <StructuredValue value={nested} depth={depth + 1} /> : <span>{displayValue(nested)}</span>}
                  </div>
                ))}
              </div>
            ) : <span>{displayValue(item)}</span>}
          </div>
        ))}
      </div>
    )
  }

  if (isRecord(value)) {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([key, nested]) => (
          <div key={key}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 mb-1">{key.replace(/([A-Z])/g, " $1")}</p>
            <StructuredValue value={nested} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-xs text-neutral-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{displayValue(value)}</span>
}

export function StageDeliverableView({ projectId, type, title, description, onOpenAi }: StageViewProps) {
  const [content, setContent] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasData, setHasData] = useState(false)
  const [stale, setStale] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/${type}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Unable to load this stage.")
      const contextResponse = await fetch(`/api/projects/${projectId}/context`)
      const contextPayload = await contextResponse.json().catch(() => ({}))
      const staleTypes = Array.isArray(contextPayload.context?.metadata?.staleDeliverables) ? contextPayload.context.metadata.staleDeliverables.map(String) : []
      setStale(staleTypes.includes(type))
      const versionId = payload?.currentVersionId || payload?.versions?.[0]?.id
      if (!versionId) {
        setContent(null)
        setHasData(false)
        return
      }
      const versionResponse = await fetch(`/api/projects/${projectId}/deliverables/${type}/versions/${versionId}`)
      const versionPayload = await versionResponse.json().catch(() => ({}))
      if (!versionResponse.ok) throw new Error(versionPayload.error || "Unable to load the persisted version.")
      setContent(versionPayload.content)
      setHasData(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load this stage.")
      setContent(null)
      setHasData(false)
    } finally {
      setLoading(false)
    }
  }, [projectId, type])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Unable to generate ${title}.`)
      toast.success(`${title} generated and saved.`)
      await load()
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : `Unable to generate ${title}.`
      setError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
      <CardHeader className="border-b border-[#E5DFD4] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-extrabold text-neutral-900 flex items-center gap-2">
              {hasData ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <FileJson className="w-5 h-5 text-neutral-500" />}
              {title}
            </CardTitle>
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            {onOpenAi && (
              <Button variant="outline" size="sm" onClick={onOpenAi} className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F472B6]" /> Ask AI
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={generate}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? "Generating..." : hasData ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-40 gap-2 text-xs text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading persisted project data...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-red-900">This stage could not be loaded.</p>
              <p className="text-xs text-red-800 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={load} className="mt-3 border-red-200 text-xs rounded-full gap-1.5 text-red-900 hover:bg-red-100/60">
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          </div>
        ) : hasData ? (
          <div className="space-y-4">
            {stale && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 font-medium">
                ⚠️ Project context changed after this output was generated. Review the evidence and regenerate when ready.
              </div>
            )}
            <div className="flex items-center justify-between">
              <Badge variant="outline">Persisted structured output</Badge>
            </div>
            <StructuredValue value={content} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#E5DFD4] bg-[#FAF8F2] p-10 text-center">
            <FileJson className="w-10 h-10 text-neutral-400 mx-auto" />
            <h3 className="text-sm font-extrabold text-neutral-900 mt-3">No {title.toLowerCase()} generated yet</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
              Generate this stage from the persisted Project Context and the previous transformation outputs.
            </p>
            <Button
              variant="default"
              size="sm"
              onClick={generate}
              disabled={generating}
              className="mt-5 gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#FEE895]" />}
              Generate from project data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
