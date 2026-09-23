"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { History, GitCompare, RotateCcw, Sparkles, User, FileCode, CheckCircle, Loader2 } from "lucide-react"
import { computeDiff, TextDiffSummary } from "@/lib/diff"
import { toast } from "sonner"

export interface DeliverableVersionItem {
  id: string
  deliverableId: string
  versionNumber: number
  content: any
  source: "AI" | "USER_EDIT" | string
  language: string
  createdById: string | null
  note: string | null
  createdAt: string
  createdBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface VersionHistoryPanelProps {
  projectId: string
  deliverableType: string
  deliverableTitle?: string
  currentVersionId?: string | null
  onVersionRestored?: () => void
  className?: string
}

export function VersionHistoryPanel({
  projectId,
  deliverableType,
  deliverableTitle,
  currentVersionId,
  onVersionRestored,
  className = ""
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<DeliverableVersionItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  // Side-by-side diff comparison state
  const [selectedVersionAId, setSelectedVersionAId] = useState<string>("")
  const [selectedVersionBId, setSelectedVersionBId] = useState<string>("")
  const [diffMode, setDiffMode] = useState<boolean>(false)
  const [diffData, setDiffData] = useState<TextDiffSummary | null>(null)

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/deliverables/${deliverableType}/versions`)
      const data = await res.json()
      if (res.ok && data.ok) {
        const list: DeliverableVersionItem[] = data.versions || []
        setVersions(list)
        if (list.length >= 2) {
          setSelectedVersionAId(list[1].id) // older
          setSelectedVersionBId(list[0].id) // newer
        } else if (list.length === 1) {
          setSelectedVersionAId(list[0].id)
          setSelectedVersionBId(list[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch version history:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, deliverableType])

  useEffect(() => {
    if (projectId && deliverableType) {
      fetchVersions()
    }
  }, [projectId, deliverableType, fetchVersions])

  // Recalculate diff when selected versions change
  useEffect(() => {
    if (!selectedVersionAId || !selectedVersionBId || versions.length === 0) {
      setDiffData(null)
      return
    }

    const vA = versions.find((v) => v.id === selectedVersionAId)
    const vB = versions.find((v) => v.id === selectedVersionBId)

    if (vA && vB) {
      const textA = typeof vA.content === "string" ? vA.content : JSON.stringify(vA.content, null, 2)
      const textB = typeof vB.content === "string" ? vB.content : JSON.stringify(vB.content, null, 2)
      const computed = computeDiff(textA, textB)
      setDiffData(computed)
    }
  }, [selectedVersionAId, selectedVersionBId, versions])

  const handleRestore = async (version: DeliverableVersionItem) => {
    if (!window.confirm(`Are you sure you want to restore deliverable to version v${version.versionNumber}?`)) {
      return
    }

    try {
      setRestoringId(version.id)
      const res = await fetch(
        `/api/projects/${projectId}/deliverables/${deliverableType}/versions/${version.id}/restore`,
        { method: "POST" }
      )
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to restore version")
      }

      toast.success(`Successfully restored to v${version.versionNumber}`)
      await fetchVersions()
      if (onVersionRestored) onVersionRestored()
    } catch (error: any) {
      toast.error(error.message || "Failed to restore version")
    } finally {
      setRestoringId(null)
    }
  }

  const versionA = versions.find((v) => v.id === selectedVersionAId)
  const versionB = versions.find((v) => v.id === selectedVersionBId)

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">
            {deliverableTitle ? `Version History — ${deliverableTitle}` : "Version History"}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {versions.length} versions
          </Badge>
        </div>

        {versions.length >= 2 && (
          <Button
            variant={diffMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => setDiffMode(!diffMode)}
            className="h-7 text-xs gap-1"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>{diffMode ? "Close Diff Comparison" : "Compare Side-by-Side"}</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading versions...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No version history recorded yet.
          </div>
        ) : (
          <>
            {/* Side-by-side diff comparison panel */}
            {diffMode && diffData && (
              <div className="border border-indigo-200 rounded-lg p-3 bg-slate-950 text-slate-100 text-xs font-mono space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-bold">Base Version (A):</span>
                    <select
                      value={selectedVersionAId}
                      onChange={(e) => setSelectedVersionAId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-xs"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber} ({v.source}) — {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-slate-500">vs</span>

                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-400 font-bold">Target Version (B):</span>
                    <select
                      value={selectedVersionBId}
                      onChange={(e) => setSelectedVersionBId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-xs"
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber} ({v.source}) — {new Date(v.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Diff metrics bar */}
                <div className="flex items-center space-x-4 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded">
                  <span className="text-emerald-400 font-bold">+{diffData.additions} additions</span>
                  <span className="text-rose-400 font-bold">-{diffData.deletions} deletions</span>
                  <span>{diffData.lines.length} total lines compared</span>
                </div>

                {/* Visual diff viewer */}
                <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1 font-mono text-[11px]">
                  {diffData.lines.map((line, idx) => {
                    let bg = "hover:bg-slate-900"
                    let textColor = "text-slate-300"
                    let prefix = " "

                    if (line.type === "added") {
                      bg = "bg-emerald-950/70 border-l-2 border-emerald-500"
                      textColor = "text-emerald-300"
                      prefix = "+"
                    } else if (line.type === "removed") {
                      bg = "bg-rose-950/70 border-l-2 border-rose-500"
                      textColor = "text-rose-300"
                      prefix = "-"
                    }

                    return (
                      <div key={idx} className={`px-2 py-0.5 flex items-start space-x-2 rounded-2xs ${bg} ${textColor}`}>
                        <span className="w-4 text-slate-500 select-none text-[10px]">{prefix}</span>
                        <span className="whitespace-pre-wrap break-all flex-1">{line.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Version List Timeline */}
            <div className="space-y-3">
              {versions.map((v) => {
                const isActive = v.id === currentVersionId || (v === versions[0] && !currentVersionId)
                const isRestoring = restoringId === v.id

                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isActive ? "bg-indigo-50/60 border-indigo-300" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                        v{v.versionNumber}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900">Version {v.versionNumber}</span>
                          <Badge
                            variant={v.source === "AI" ? "secondary" : "outline"}
                            className="text-[10px] gap-1 px-1.5"
                          >
                            {v.source === "AI" ? (
                              <Sparkles className="w-3 h-3 text-indigo-500" />
                            ) : (
                              <User className="w-3 h-3 text-slate-500" />
                            )}
                            {v.source}
                          </Badge>
                          {isActive && (
                            <Badge variant="default" className="text-[10px] bg-emerald-600">
                              <CheckCircle className="w-3 h-3 mr-1" /> Active
                            </Badge>
                          )}
                        </div>

                        <p className="text-slate-600 text-[11px]">
                          {v.note || "No version note provided."}
                        </p>

                        <div className="text-[10px] text-slate-400">
                          {v.createdBy?.name || v.createdBy?.email || "System"} •{" "}
                          {new Date(v.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRestoring}
                        onClick={() => handleRestore(v)}
                        className="h-7 text-xs gap-1 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        {isRestoring ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Restore</span>
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
