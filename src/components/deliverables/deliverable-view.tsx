"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DeliverableDiff } from "./deliverable-diff"
import { diffDeliverable, DiffResult } from "@/lib/diff"
import { Loader2 } from "lucide-react"

export type DeliverableVersionObj = {
  id: string
  versionNumber: number
  source: string
  createdAt: string
  note: string | null
}

export type DeliverableObj = {
  id: string
  projectId: string
  type: string
  title: string
  status: string
  versions: DeliverableVersionObj[]
}

type Props = {
  projectId: string
  type: string
  title: string
  renderer: (content: unknown) => React.ReactNode
}

export function DeliverableView({ projectId, type, title, renderer }: Props) {
  const [deliverable, setDeliverable] = React.useState<DeliverableObj | null>(null)
  
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const [selectedVersionId, setSelectedVersionId] = React.useState<string>("")
  const [selectedContent, setSelectedContent] = React.useState<unknown>(null)
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Diff-specific state
  const [showDiff, setShowDiff] = React.useState(false)
  const [diffBaseId, setDiffBaseId] = React.useState<string>("")
  const [computedDiffs, setComputedDiffs] = React.useState<DiffResult[]>([])
  const [showUnchanged, setShowUnchanged] = React.useState(false)

  const fetchDeliverable = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${type}`)
      if (!res.ok) throw new Error("Failed to load deliverable")
      const data = await res.json()
      setDeliverable(data)
      if (data && data.versions.length > 0) {
        setSelectedVersionId(data.versions[0].id)
      } else {
        setDeliverable(null)
      }
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, type])

  React.useEffect(() => {
    fetchDeliverable()
  }, [fetchDeliverable])

  // Fetch actual version content when selectedVersionId changes
  React.useEffect(() => {
    if (!selectedVersionId) return
    const fetchContent = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/deliverables/${type}/versions/${selectedVersionId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedContent(data.content)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchContent()
  }, [selectedVersionId, projectId, type])

  // Fetch base content when comparing diffs
  React.useEffect(() => {
    if (!showDiff || !diffBaseId || !selectedVersionId) return
    const fetchBaseAndCompute = async () => {
      try {
        const baseRes = await fetch(`/api/projects/${projectId}/deliverables/${type}/versions/${diffBaseId}`)
        if (baseRes.ok) {
          const baseData = await baseRes.json()
          setComputedDiffs(diffDeliverable(baseData.content, selectedContent))
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchBaseAndCompute()
  }, [showDiff, diffBaseId, selectedVersionId, selectedContent, projectId, type])

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      })
      if (!res.ok) throw new Error("Generation failed")
      await fetchDeliverable() // Refresh
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message)
      alert("Failed to generate deliverable")
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) return <div className="space-y-4 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-[400px] w-full" /></div>
  if (error) return <div className="p-6 text-red-500">Error: {error}<Button onClick={fetchDeliverable} className="ml-4">Retry</Button></div>

  if (!deliverable) {
    return (
      <div className="p-12 flex flex-col items-center justify-center border rounded-lg m-6 bg-muted/50">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">This deliverable has not been generated yet.</p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate with AI
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full m-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <Badge variant="secondary">{deliverable.status}</Badge>
        </div>
        <div className="flex items-center space-x-3">
          {showDiff ? (
            <>
              <Select value={diffBaseId} onValueChange={setDiffBaseId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Compare with..." /></SelectTrigger>
                <SelectContent>
                  {deliverable.versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber} ({v.source}) {v.id === selectedVersionId && "(Current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setShowUnchanged(!showUnchanged)}>
                {showUnchanged ? "Hide Unchanged" : "Show Unchanged"}
              </Button>
              <Button variant="secondary" onClick={() => setShowDiff(false)}>Exit Diff Mode</Button>
            </>
          ) : (
            <>
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select version" /></SelectTrigger>
                <SelectContent>
                  {deliverable.versions.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.versionNumber} ({v.source})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                const prev = deliverable.versions.find(v => v.id !== selectedVersionId)
                if (prev) {
                  setDiffBaseId(prev.id)
                  setShowDiff(true)
                }
              }} disabled={deliverable.versions.length < 2}>
                Compare
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerate
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {showDiff ? (
          <DeliverableDiff diffs={computedDiffs} showUnchanged={showUnchanged} />
        ) : selectedContent ? (
          renderer(selectedContent)
        ) : (
          <div className="p-12 flex justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
      </div>
    </div>
  )
}
