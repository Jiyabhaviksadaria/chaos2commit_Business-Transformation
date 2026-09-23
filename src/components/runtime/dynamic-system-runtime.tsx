"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Terminal, Loader2, Cpu, Code } from "lucide-react"
import { toast } from "sonner"

interface DynamicSystemRuntimeProps {
  projectId: string
  moduleKey?: string
}

export function DynamicSystemRuntime({ projectId, moduleKey = "recruitment" }: DynamicSystemRuntimeProps) {
  const [actionType, setActionType] = useState<"SCRIPT" | "STATE_TRANSITION" | "CSV_STREAM">("SCRIPT")
  const [inputJson, setInputJson] = useState<string>('{\n  "applicantId": "app_99",\n  "experienceYears": 5\n}')
  const [loading, setLoading] = useState<boolean>(false)
  const [output, setOutput] = useState<any>(null)
  const [executionMs, setExecutionMs] = useState<number | null>(null)

  const handleRun = async () => {
    try {
      setLoading(true)
      let parsedInput = {}
      try {
        parsedInput = JSON.parse(inputJson)
      } catch {
        toast.error("Invalid JSON input")
        setLoading(false)
        return
      }

      const res = await fetch(`/api/projects/${projectId}/runtime/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          moduleKey,
          inputData: parsedInput,
          currentState: "SUBMITTED",
          nextState: "UNDER_REVIEW"
        })
      })
      const data = await res.json()
      if (res.ok) {
        setOutput(data.result)
        setExecutionMs(data.executionTimeMs)
        toast.success(`Executed ${actionType} in ${data.executionTimeMs}ms`)
      } else {
        toast.error(data.error || "Runtime execution failed")
      }
    } catch (error) {
      console.error("Runtime execution UI error:", error)
      toast.error("Network error executing runtime action")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
      <CardHeader className="py-4 px-6 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center">
            <Cpu className="h-4.5 w-4.5 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base font-extrabold text-neutral-900">Advanced System Runtime Environment</CardTitle>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-mono font-bold">
                module: {moduleKey}
              </Badge>
            </div>
            <CardDescription className="text-xs text-neutral-500">Executes custom business rules, BPMN state machines, and data transformations.</CardDescription>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {(["SCRIPT", "STATE_TRANSITION", "CSV_STREAM"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActionType(type)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                actionType === type
                  ? "bg-[#18181C] text-white border-[#18181C]"
                  : "bg-white text-neutral-600 border-[#E5DFD4] hover:bg-neutral-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Sandbox */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-neutral-500" /> Input Payload (JSON)
            </span>
            <Button
              size="sm"
              onClick={handleRun}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1 h-7 rounded-full shadow-xs gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>Run Execution</span>
            </Button>
          </div>
          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            className="w-full h-44 p-3 bg-white border border-[#E5DFD4] rounded-2xl font-mono text-xs text-neutral-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Output Console */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-neutral-500" /> Runtime Output Console
            </span>
            {executionMs !== null && (
              <Badge variant="outline" className="text-[10px] bg-neutral-100 border-neutral-300 text-neutral-700 font-mono">
                {executionMs}ms
              </Badge>
            )}
          </div>
          <div className="w-full h-44 p-3 bg-[#1E1E24] border border-[#33333D] rounded-2xl overflow-auto font-mono text-xs text-emerald-400">
            {output ? (
              <pre>{JSON.stringify(output, null, 2)}</pre>
            ) : (
              <span className="text-neutral-500 font-sans italic">&#47;&#47; Click Run Execution to execute sandbox logic...</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
