"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Users, MessageSquare, Activity, ShieldCheck, Mail, RefreshCw, Loader2, Sparkles } from "lucide-react"
import { DeliverableComments } from "@/components/collaboration/deliverable-comments"
import { ProjectActivityTimeline } from "@/components/collaboration/project-activity-timeline"
import { toast } from "sonner"

export default function ProjectCollaborationPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<any>(null)
  const [deliverables, setDeliverables] = useState<any[]>([])
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProjectDetails = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      const data = await res.json()
      if (res.ok && data.ok) {
        setProject(data.project)
        setDeliverables(data.project.deliverables || [])
        if (data.project.deliverables && data.project.deliverables.length > 0) {
          setSelectedDeliverableId(data.project.deliverables[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load project details:", error)
      toast.error("Failed to load collaboration data")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails()
    }
  }, [projectId, fetchProjectDetails])

  if (loading && !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <span className="text-sm font-medium text-slate-600">Loading collaboration workspace...</span>
      </div>
    )
  }

  const teamMembers = project?.workspace?.organization?.users || [
    { id: "owner", name: "Project Lead", email: "lead@workspace.com", role: "OWNER" }
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Project</span>
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <h1 className="text-sm font-semibold text-slate-900">
              {project?.name || "Project"} — Team & Collaboration Workspace
            </h1>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
              Active Session
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchProjectDetails} className="h-8 text-xs gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </Button>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner / Overview Card */}
        <Card className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white border-0 shadow-md">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Team Collaboration & Activity Dashboard
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                Collaborate in real time with team members across deliverables, review activity logs, post inline feedback with @mentions, and manage review threads.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-white">{teamMembers.length}</div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-wider">Team Members</div>
              </div>
              <div className="h-8 w-px bg-indigo-700" />
              <div className="text-right">
                <div className="text-xl font-bold text-white">{deliverables.length}</div>
                <div className="text-[10px] text-indigo-300 uppercase tracking-wider">Deliverables</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Team Directory & Deliverable Selector */}
          <div className="space-y-6">
            {/* Team Directory Card */}
            <Card className="border shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {teamMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg border bg-slate-50/70">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {member.name ? member.name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{member.name || "Collaborator"}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {member.email}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">
                      {member.role || "MEMBER"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Deliverable Discussion Selector */}
            <Card className="border shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-sm font-semibold">Select Deliverable Discussion</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {deliverables.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-4">No deliverables generated yet.</div>
                ) : (
                  deliverables.map((del: any) => (
                    <button
                      key={del.id}
                      onClick={() => setSelectedDeliverableId(del.id)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between border transition-colors ${
                        selectedDeliverableId === del.id
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{del.title || del.type}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        v{del.versions?.length || 1}
                      </Badge>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle & Right Columns: Inline Comments & Activity Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inline Comments Container */}
            {selectedDeliverableId ? (
              <DeliverableComments
                projectId={projectId}
                deliverableId={selectedDeliverableId}
                deliverableTitle={deliverables.find((d) => d.id === selectedDeliverableId)?.title || "Selected Deliverable"}
              />
            ) : (
              <Card className="border shadow-sm p-6 text-center text-xs text-slate-400">
                Select a deliverable on the left panel to view and post inline comments.
              </Card>
            )}

            {/* Project Activity Timeline Feed */}
            <ProjectActivityTimeline projectId={projectId} limit={50} />
          </div>
        </div>
      </main>
    </div>
  )
}
