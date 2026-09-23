"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Cpu, ArrowLeft, CheckCircle, Save, Loader2, Sparkles, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface ModelConfig {
  provider: string
  model: string
  status: string
  temperature: number
  maxTokens: number
  fallbackPriority: number
  creditRate: number
  apiStatus: string
}

export default function AdminModelsPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [models, setModels] = useState<ModelConfig[]>([])

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/models")
      const data = await res.json()
      if (res.ok && data.models) {
        setModels(data.models)
      }
    } catch (error) {
      console.error("Failed to load model config:", error)
      toast.error("Failed to load AI model settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleUpdateField = (index: number, field: keyof ModelConfig, value: any) => {
    const updated = [...models]
    updated[index] = { ...updated[index], [field]: value }
    setModels(updated)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Saved AI model configuration")
      } else {
        toast.error(data.error || "Save failed")
      }
    } catch (error) {
      console.error("Save failed:", error)
      toast.error("Network error while saving AI model configuration")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans bg-[#F7F4EB] min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-xs">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">AI Model Orchestration Console</h1>
              <span className="bg-[#F8B4D9] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                AI Management
              </span>
            </div>
            <p className="text-xs text-neutral-500">Configure provider fallback chains, token limits, temperature, and credit consumption rates.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchModels} className="bg-white border-[#E5DFD4] text-xs gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#18181C] text-white hover:bg-neutral-800 text-xs font-bold gap-1.5 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-neutral-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading AI model telemetry & settings...
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((modelItem, idx) => (
            <Card key={idx} className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
              <CardHeader className="py-3 px-5 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center">
                    <Cpu className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-neutral-900">{modelItem.provider} — {modelItem.model}</CardTitle>
                    <CardDescription className="text-[11px] text-neutral-500">Priority #{modelItem.fallbackPriority} in fallback chain</CardDescription>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-[10px] bg-white border-[#E5DFD4] text-neutral-800 font-bold">
                    {modelItem.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 gap-1">
                    <CheckCircle className="w-3 h-3" /> {modelItem.apiStatus}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Max Tokens Limit</label>
                  <Input
                    type="number"
                    value={modelItem.maxTokens}
                    onChange={(e) => handleUpdateField(idx, "maxTokens", parseInt(e.target.value) || 2048)}
                    className="bg-white border-[#E5DFD4] text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Temperature (0.0 - 1.0)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={modelItem.temperature}
                    onChange={(e) => handleUpdateField(idx, "temperature", parseFloat(e.target.value) || 0.2)}
                    className="bg-white border-[#E5DFD4] text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Fallback Priority Order</label>
                  <Input
                    type="number"
                    value={modelItem.fallbackPriority}
                    onChange={(e) => handleUpdateField(idx, "fallbackPriority", parseInt(e.target.value) || 1)}
                    className="bg-white border-[#E5DFD4] text-xs h-8"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-1">Credit Cost Multiplier</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={modelItem.creditRate}
                    onChange={(e) => handleUpdateField(idx, "creditRate", parseFloat(e.target.value) || 1.0)}
                    className="bg-white border-[#E5DFD4] text-xs h-8"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-white border border-[#E5DFD4] rounded-[24px] p-4 text-xs text-neutral-600 flex items-center space-x-3">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
        <p>
          <span className="font-bold text-neutral-900">Automatic Failover Protection:</span> If primary providers hit rate limits or downtime, requests seamlessly fail over to Groq and the local offline safeguard engine (`AI_MOCK`), ensuring zero downtime for business blueprint generation.
        </p>
      </Card>
    </div>
  )
}
