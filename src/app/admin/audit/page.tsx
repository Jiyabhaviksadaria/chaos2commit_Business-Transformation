"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Clock, Loader2, RefreshCw, ArrowLeft } from "lucide-react"

interface AuditLogItem {
  id: string
  actorId?: string
  action: string
  entity?: string
  entityId?: string
  createdAt: string
  metadata?: any
}

export default function AdminAuditPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [logs, setLogs] = useState<AuditLogItem[]>([])

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/audit")
      const data = await res.json()
      if (res.ok && data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to load audit logs:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

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
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Global Audit & Security Log Feed</h1>
              <span className="bg-[#B8DF9E] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Security Audit
              </span>
            </div>
            <p className="text-xs text-neutral-500">Immutable platform audit trail tracking AI executions, deliverable updates, and user actions.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchAuditLogs} className="bg-white border-[#E5DFD4] text-xs gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Audit Trail
        </Button>
      </div>

      {/* Audit Log Card */}
      <Card className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
        <CardHeader className="py-3 px-5 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" /> Platform Security Log
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500">Showing latest {logs.length} recorded platform operations.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading audit trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">No activity logs recorded yet.</div>
          ) : (
            <div className="divide-y divide-[#E5DFD4]">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-white/50 transition-colors text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-[10px] bg-white border-[#E5DFD4] text-neutral-900 font-mono">
                        {log.action}
                      </Badge>
                      {log.entity && (
                        <span className="text-neutral-600 font-bold">
                          {log.entity} {log.entityId && `(${log.entityId})`}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </p>
                  </div>

                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                    AUDITED
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
