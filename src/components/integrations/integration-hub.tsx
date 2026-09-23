"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Share2, CheckCircle2, RefreshCw, Loader2, Link2, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface IntegrationItem {
  id: string
  key: string
  name: string
  category: string
  status: string
  details: string
}

interface IntegrationHubProps {
  projectId: string
}

export function IntegrationHub({ projectId }: IntegrationHubProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/integrations`)
      const data = await res.json()
      if (res.ok && data.integrations) {
        setIntegrations(data.integrations)
      }
    } catch (error) {
      console.error("Failed to load integrations:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  const toggleStatus = async (item: IntegrationItem) => {
    const nextStatus = item.status === "CONNECTED" ? "READY" : "CONNECTED"
    try {
      setUpdatingId(item.id)
      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: item.id, status: nextStatus })
      })
      const data = await res.json()
      if (res.ok && data.integrations) {
        setIntegrations(data.integrations)
        toast.success(`${item.name} is now ${nextStatus}`)
      } else {
        toast.error("Failed to update integration")
      }
    } catch (error) {
      console.error("Integration toggle error:", error)
      toast.error("Network error updating integration")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
      <CardHeader className="py-4 px-6 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 border border-indigo-300 flex items-center justify-center">
            <Share2 className="h-4.5 w-4.5 text-indigo-700" />
          </div>
          <div>
            <CardTitle className="text-base font-extrabold text-neutral-900">Enterprise Integrations & Developer Toolchains</CardTitle>
            <CardDescription className="text-xs text-neutral-500">Sync transformation deliverables, code specs, and roadmap epics with external software.</CardDescription>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchIntegrations} className="bg-white border-[#E5DFD4] text-xs gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading enterprise integrations...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((item) => (
              <div key={item.id} className="bg-white border border-[#E5DFD4] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-neutral-900">{item.name}</span>
                      <Badge variant="outline" className="text-[10px] bg-[#FAF8F2] border-[#E5DFD4] text-neutral-600">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">{item.details}</p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      item.status === "CONNECTED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-blue-50 text-blue-700 border-blue-300"
                    }`}
                  >
                    {item.status === "CONNECTED" ? (
                      <span className="flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>CONNECTED</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Link2 className="w-3 h-3" />
                        <span>READY TO SYNC</span>
                      </span>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F0EBE1]">
                  <span className="text-[10px] text-neutral-400 font-mono">ID: {item.key}</span>
                  <Button
                    size="sm"
                    variant={item.status === "CONNECTED" ? "outline" : "default"}
                    onClick={() => toggleStatus(item)}
                    disabled={updatingId === item.id}
                    className={`text-xs h-7 px-3 rounded-full ${
                      item.status === "CONNECTED"
                        ? "bg-white border-[#E5DFD4] text-neutral-700 hover:bg-neutral-100"
                        : "bg-[#18181C] text-white hover:bg-neutral-800"
                    }`}
                  >
                    {updatingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.status === "CONNECTED" ? (
                      "Disconnect"
                    ) : (
                      "Connect Sync"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-center space-x-2.5 text-xs text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong className="font-bold">Automated Webhooks & Webhooks Guard:</strong> Real-time webhook events are fired on every blueprint approval, trigger build request, and export generation.
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
