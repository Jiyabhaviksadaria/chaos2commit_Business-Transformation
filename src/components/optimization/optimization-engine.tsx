"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, CheckCircle2, RefreshCw, Loader2, TrendingUp, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface RecommendationItem {
  id: string
  title: string
  category: string
  impact: string
  effort: string
  status: string
  description: string
  actionSummary: string
}

interface OptimizationEngineProps {
  projectId: string
}

export function OptimizationEngine({ projectId }: OptimizationEngineProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [score, setScore] = useState<number>(85)
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])

  const fetchOptimizations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/optimization`)
      const data = await res.json()
      if (res.ok) {
        setScore(data.optimizationScore || 85)
        setRecommendations(data.recommendations || [])
      }
    } catch (error) {
      console.error("Failed to load optimizations:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchOptimizations()
  }, [fetchOptimizations])

  const handleApply = async (item: RecommendationItem) => {
    try {
      setApplyingId(item.id)
      const res = await fetch(`/api/projects/${projectId}/optimization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId: item.id })
      })
      const data = await res.json()
      if (res.ok && data.recommendations) {
        setRecommendations(data.recommendations)
        toast.success(`Applied: ${item.title}`)
      } else {
        toast.error("Failed to apply recommendation")
      }
    } catch (error) {
      console.error("Apply optimization error:", error)
      toast.error("Network error applying recommendation")
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <Card className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
      <CardHeader className="py-4 px-6 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-extrabold text-neutral-900">AI Continuous Optimization Engine</CardTitle>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
                Health Score: {score}%
              </Badge>
            </div>
            <CardDescription className="text-xs text-neutral-500">Real-time bottleneck scanner and one-click blueprint optimizer.</CardDescription>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchOptimizations} className="bg-white border-[#E5DFD4] text-xs gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Re-scan
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Scanning deliverables & runtime telemetry...
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((item) => (
              <div key={item.id} className="bg-white border border-[#E5DFD4] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-neutral-900">{item.title}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-extrabold">
                      <TrendingUp className="w-3 h-3 mr-1 inline" />
                      {item.impact}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-[#FAF8F2] border-[#E5DFD4] text-neutral-600">
                      {item.category}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-neutral-600">{item.description}</p>
                  <p className="text-[10px] text-neutral-400 font-mono">Action: {item.actionSummary}</p>
                </div>

                <div className="shrink-0">
                  {item.status === "APPLIED" ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-3 py-1 font-bold gap-1">
                      <CheckCircle2 className="w-3 h-3" /> APPLIED
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApply(item)}
                      disabled={applyingId === item.id}
                      className="bg-[#18181C] text-white hover:bg-neutral-800 text-xs font-bold px-4 py-1.5 rounded-full shadow-xs gap-1.5"
                    >
                      {applyingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Apply Recommendation</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
