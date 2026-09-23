"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VersionHistoryPanel } from "@/components/versioning/version-history-panel"
import { ApprovalWorkflowCard } from "@/components/versioning/approval-workflow-card"
import { History, GitCommit, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

const DELIVERABLE_TYPES = [
  { id: "WEBSITE_SPEC", label: "Website Spec" },
  { id: "SYSTEM_SPEC", label: "System Architecture" },
  { id: "BPMN_PROCESS", label: "BPMN Process Maps" },
  { id: "UX_WIREFRAMES", label: "UX & Wireframes" },
  { id: "ERD_SCHEMA", label: "Database ERD" },
  { id: "API_SPEC", label: "API Specifications" },
  { id: "ROADMAP", label: "Transformation Roadmap" }
]

export default function ProjectVersionsPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const [selectedType, setSelectedType] = useState<string>("WEBSITE_SPEC")
  const [refreshKey, setRefreshKey] = useState<number>(0)

  const activeTypeObj = DELIVERABLE_TYPES.find((d) => d.id === selectedType) || DELIVERABLE_TYPES[0]

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href={`/projects/${projectId}`} className="hover:text-indigo-600 flex items-center space-x-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project Dashboard</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Versions & Approvals</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Version Control & Sign-Off Workflow</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare side-by-side deliverable diffs, restore historical versions, and manage reviewer sign-offs.
          </p>
        </div>
      </div>

      {/* Deliverable Selector Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b text-xs">
        {DELIVERABLE_TYPES.map((item) => {
          const isActive = item.id === selectedType
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType(item.id)}
              className={`h-8 text-xs shrink-0 ${
                isActive ? "bg-indigo-600 text-white font-medium" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span>{item.label}</span>
            </Button>
          )
        })}
      </div>

      {/* Deliverable Overview Header */}
      <Card className="border bg-slate-50/50">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <GitCommit className="w-4 h-4 text-indigo-600" />
              <span>Deliverable: {activeTypeObj.label}</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Review history, inspect content diffs, and action sign-off requests for {activeTypeObj.label}.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" key={refreshKey}>
        {/* Sign-Off & Approvals Card */}
        <div className="lg:col-span-1">
          <ApprovalWorkflowCard
            projectId={projectId}
            deliverableType={selectedType}
            deliverableTitle={activeTypeObj.label}
            onStatusUpdated={handleRefresh}
          />
        </div>

        {/* Version History & Side-by-Side Diff Panel */}
        <div className="lg:col-span-2">
          <VersionHistoryPanel
            projectId={projectId}
            deliverableType={selectedType}
            deliverableTitle={activeTypeObj.label}
            onVersionRestored={handleRefresh}
          />
        </div>
      </div>
    </div>
  )
}
