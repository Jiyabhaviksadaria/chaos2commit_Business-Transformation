"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity, Sparkles, CheckCircle2, MessageSquare, Palette,
  Database, FileText, User, RefreshCw, Loader2, Layers, AlertCircle
} from "lucide-react"

export interface ActivityItem {
  id: string
  organizationId: string
  projectId: string | null
  actorId: string | null
  action: string
  entity: string
  entityId: string
  metadata: any
  createdAt: string
  actor: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  } | null
}

interface ProjectActivityTimelineProps {
  projectId: string
  className?: string
  limit?: number
}

export function ProjectActivityTimeline({
  projectId,
  className = "",
  limit = 30
}: ProjectActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/activity?limit=${limit}`)
      const data = await res.json()
      if (res.ok && data.ok) {
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error)
    } finally {
      setLoading(false)
    }
  }, [projectId, limit])

  useEffect(() => {
    if (projectId) {
      fetchActivities()
    }
  }, [projectId, fetchActivities])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "comment_added":
        return <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
      case "comment_resolved":
      case "comment_reopened":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      case "website_customization_requested":
      case "website_customized":
      case "website_restored":
        return <Palette className="w-3.5 h-3.5 text-purple-500" />
      case "blueprint_approved":
      case "blueprint_edited":
        return <Layers className="w-3.5 h-3.5 text-amber-500" />
      case "deliverable_generated":
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
      case "record_created":
      case "record_updated":
      case "record_deleted":
        return <Database className="w-3.5 h-3.5 text-cyan-500" />
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />
    }
  }

  const formatActionTitle = (item: ActivityItem) => {
    const actorName = item.actor?.name || item.actor?.email || "System"
    switch (item.action) {
      case "comment_added":
        return `${actorName} commented on a deliverable`
      case "comment_resolved":
        return `${actorName} resolved a comment thread`
      case "website_customization_requested":
        return `${actorName} requested website customization`
      case "website_customized":
        return `${actorName} applied website updates`
      case "website_restored":
        return `${actorName} restored a previous website version`
      case "blueprint_approved":
        return `${actorName} approved the Master Blueprint`
      case "deliverable_generated":
        return `${actorName} generated a project deliverable`
      case "record_created":
        return `${actorName} created a new record in System Runtime`
      default:
        return `${actorName} performed ${item.action.replace(/_/g, " ")}`
    }
  }

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-semibold">Project Activity Audit Feed</CardTitle>
          <Badge variant="outline" className="text-xs">
            {activities.length} events
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchActivities} disabled={loading} className="h-7 w-7 p-0">
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading activity feed...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No activity recorded yet for this project.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((item) => (
              <div key={item.id} className="relative flex items-start space-x-3 text-xs">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-xs">
                  {getActionIcon(item.action)}
                </div>

                <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-md p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{formatActionTitle(item)}</span>
                    <span className="text-[10px] text-slate-400">{formatRelativeTime(item.createdAt)}</span>
                  </div>

                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <div className="mt-1 text-[11px] text-slate-600 bg-white/60 p-1.5 rounded border border-slate-100 font-mono">
                      {item.metadata.prompt && <div>Prompt: "{item.metadata.prompt}"</div>}
                      {item.metadata.summary && <div>Summary: {item.metadata.summary}</div>}
                      {item.metadata.deliverableType && <div>Deliverable: {item.metadata.deliverableType}</div>}
                      {item.metadata.note && <div>Note: {item.metadata.note}</div>}
                    </div>
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
