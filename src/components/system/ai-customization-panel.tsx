"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export interface ChangeRecord {
  id: string
  projectId: string
  prompt: string
  summary: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delta: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  impact: any
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED" | "FAILED"
  createdAt: string
}

export function AiCustomizationPanel({
  projectId,
  onCustomizationApplied
}: {
  projectId: string
  onCustomizationApplied: () => void
}) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeChange, setActiveChange] = useState<ChangeRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const handleGenerateProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/blueprint/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() })
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error)

      setActiveChange(data.change)
      toast.success("AI customization proposal generated!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate customization proposal")
    } finally {
      setLoading(false)
    }
  }

  const handleApproveAndApply = async () => {
    if (!activeChange) return
    setActionLoading(true)

    try {
      // 1. Approve proposal
      const appRes = await fetch(`/api/projects/${projectId}/changes/${activeChange.id}/approve`, {
        method: "POST"
      })
      const appData = await appRes.json()
      if (!appData.ok) throw new Error(appData.error)

      // 2. Apply proposal
      const applyRes = await fetch(`/api/projects/${projectId}/changes/${activeChange.id}/apply`, {
        method: "POST"
      })
      const applyData = await applyRes.json()
      if (!applyData.ok) throw new Error(applyData.error)

      setActiveChange(applyData.change)
      toast.success("Blueprint customization applied and runtime regenerated!")
      onCustomizationApplied()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply customization")
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!activeChange) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/changes/${activeChange.id}/reject`, {
        method: "POST"
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)

      setActiveChange(null)
      setPrompt("")
      toast.info("Customization proposal rejected.")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject proposal")
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Card className="border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/40 via-purple-50/30 to-background dark:from-indigo-950/20 dark:via-purple-950/10 mb-8 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">✨ Customize with AI</CardTitle>
              <CardDescription>
                Iterate and regenerate your application using natural language requests.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerateProposal} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Add a lead source field to the Leads module..."
              disabled={loading || !!activeChange}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" disabled={loading || !prompt.trim() || !!activeChange} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze Request
            </Button>
          </div>
        </form>

        {activeChange && (
          <div className="mt-6 p-4 rounded-xl border bg-card space-y-4 shadow-sm animate-in fade-in-50">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Proposed Change</span>
                <h4 className="font-bold text-base text-foreground mt-0.5">{activeChange.summary}</h4>
              </div>
              <Badge
                variant={
                  activeChange.riskLevel === "HIGH"
                    ? "destructive"
                    : activeChange.riskLevel === "MEDIUM"
                    ? "secondary"
                    : "outline"
                }
                className="gap-1 px-2.5 py-1 text-xs"
              >
                {activeChange.riskLevel === "HIGH" && <AlertTriangle className="h-3 w-3" />}
                Risk: {activeChange.riskLevel}
              </Badge>
            </div>

            {/* Changes list */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Proposed Schema Deltas:</span>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs font-mono">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {activeChange.delta?.changes?.map((ch: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <span className="font-bold">+</span>
                    <span>{ch.type}</span>
                    {ch.module && <span className="text-muted-foreground">[{ch.module}]</span>}
                    {ch.field?.name && <span>field: {ch.field.name}</span>}
                    {ch.workflow?.name && <span>workflow: {ch.workflow.name}</span>}
                    {ch.role?.role && <span>role: {ch.role.role}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Impacted Components */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg border bg-background">
                <span className="text-muted-foreground block mb-1">Affected Modules</span>
                <div className="flex flex-wrap gap-1">
                  {activeChange.impact?.affectedModules?.map((m: string) => (
                    <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border bg-background">
                <span className="text-muted-foreground block mb-1">Affected Deliverables</span>
                <div className="flex flex-wrap gap-1">
                  {activeChange.impact?.affectedDeliverables?.map((d: string) => (
                    <Badge key={d} variant="outline" className="text-[10px]">{d}</Badge>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border bg-background">
                <span className="text-muted-foreground block mb-1">Runtime Components</span>
                <div className="flex flex-wrap gap-1">
                  {activeChange.impact?.affectedRuntimeComponents?.map((c: string) => (
                    <Badge key={c} variant="default" className="text-[10px]">{c}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            {activeChange.status !== "APPLIED" && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleReject} disabled={actionLoading} className="gap-1 text-destructive hover:bg-destructive/10">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button size="sm" onClick={handleApproveAndApply} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Approve & Apply
                </Button>
              </div>
            )}

            {activeChange.status === "APPLIED" && (
              <div className="flex items-center justify-between text-xs text-emerald-600 font-medium pt-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Customization Applied & Versioned
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setActiveChange(null); setPrompt("") }} className="gap-1 text-xs">
                  New Customization <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
