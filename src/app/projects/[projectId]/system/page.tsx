"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { SystemSpecData } from "@/modules/deliverables/system-spec"
import * as Icons from "lucide-react"
import type { LucideIcon } from "lucide-react"

type CountMap = Record<string, number>

export default function SystemHomePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const [spec, setSpec] = useState<SystemSpecData | null>(null)
  const [counts, setCounts] = useState<CountMap>({})
  const [loading, setLoading] = useState(true)

  const fetchSpec = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC`)
      if (!res.ok) throw new Error("No spec")
      const d = await res.json()
      const content = d?.versions?.[0]
        ? await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${d.currentVersionId}`).then(r => r.json())
        : null
      // fallback: get content from version list
      if (d?.versions?.[0]) {
        const vRes = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${d.currentVersionId ?? d.versions[0].id}`)
        if (vRes.ok) {
          const vData = await vRes.json()
          setSpec(vData.content as SystemSpecData)
        }
      }
      void content // suppress unused
    } catch {
      // fallback: try getting spec directly
    }
    // Try alternate approach: get from generate endpoint
    const alt = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC`)
    if (alt.ok) {
      const d = await alt.json()
      if (d?.currentVersionId) {
        const vRes = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${d.currentVersionId}`)
        if (vRes.ok) {
          const v = await vRes.json()
          setSpec(v.content as SystemSpecData)
        }
      }
    }
    setLoading(false)
  }, [projectId])

  const fetchCounts = useCallback(async (modules: SystemSpecData["modules"]) => {
    const newCounts: CountMap = {}
    await Promise.all(modules.map(async (mod) => {
      try {
        const r = await fetch(`/api/projects/${projectId}/records/${mod.key}?pageSize=1`)
        if (r.ok) {
          const d = await r.json()
          newCounts[mod.key] = d.total ?? 0
        }
      } catch { /* ignore */ }
    }))
    setCounts(newCounts)
  }, [projectId])

  useEffect(() => {
    fetchSpec()
  }, [fetchSpec])

  useEffect(() => {
    if (spec?.modules) fetchCounts(spec.modules)
  }, [spec, fetchCounts])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (!spec) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="border-dashed text-center p-12">
          <CardTitle className="mb-3">No System Built Yet</CardTitle>
          <CardDescription className="mb-6">Go to the project and click &ldquo;Build my systems&rdquo; to generate the workable application.</CardDescription>
          <Button onClick={() => router.push(`/projects/${projectId}`)}>Build Systems</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Project
      </Button>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: spec.theme.primary }}>{spec.appName}</h1>
          <p className="text-muted-foreground mt-1">{spec.tagline}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {spec.theme.style}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {spec.modules.map(mod => {
          const IconComp = (Icons[mod.icon as keyof typeof Icons] as LucideIcon | undefined) ?? Icons.Box
          return (
            <Card
              key={mod.key}
              className="cursor-pointer hover:border-primary/60 transition-colors group"
              onClick={() => router.push(`/projects/${projectId}/system/${mod.key}`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: spec.theme.primary + "20" }}>
                    <IconComp className="w-5 h-5" style={{ color: spec.theme.primary }} />
                  </div>
                  <Badge variant="secondary" className="text-xs">{counts[mod.key] ?? 0} records</Badge>
                </div>
                <h3 className="font-semibold">{mod.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mod.description}</p>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {mod.views.map(v => <Badge key={v} variant="outline" className="text-xs">{v}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {spec.workflows.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Workflows</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spec.workflows.map((wf, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{i + 1}</div>
                  <div>
                    <p className="font-medium text-sm">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">Trigger: {wf.trigger}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {wf.steps.map((s, j) => <span key={j} className="text-xs bg-background border px-2 py-0.5 rounded">{s}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => toast.info("Export coming soon")}>
          <ExternalLink className="w-4 h-4 mr-2" /> Export Data
        </Button>
      </div>
    </div>
  )
}
