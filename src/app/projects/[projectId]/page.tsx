"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Project } from "@prisma/client"
import { DocumentsView } from "@/components/projects/documents-view"
import { DiscoveryView } from "@/components/projects/discovery-view"

export default function ProjectWorkspace() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (res.ok) {
        setProject(await res.json())
      } else {
        throw new Error("Failed to load")
      }
    } catch {
      toast.error("Failed to load project details")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 text-center pt-20">
        <h2 className="text-2xl font-bold mb-4">Project not found</h2>
        <Button onClick={() => router.push("/projects")}>Back to Projects</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/projects")} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{project.name}</h1>
            <div className="flex gap-2 items-center text-sm text-muted-foreground">
              <Badge variant="outline">{project.industry || "No Industry"}</Badge>
              <span>•</span>
              <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                {project.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex overflow-x-auto pb-2 mb-4 scrollbar-hide">
          <TabsList className="min-w-fit">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="discovery">Discovery</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="solutions">Solutions</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Business Goal</CardTitle>
                <CardDescription>Primary objective of this transformation phase.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{project.businessGoal}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Created At</h4>
                  <p>{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-1">Primary Language</h4>
                  <p className="uppercase">{project.language}</p>
                </div>
              </CardContent>
            </Card>
            {project.businessContext && (
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Business Context & Parameters</CardTitle>
                  <CardDescription>Extra environmental variables bound to AI analysis logic.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{project.businessContext}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <DocumentsView projectId={projectId} />
        </TabsContent>

        <TabsContent value="discovery" className="mt-0">
          <DiscoveryView projectId={projectId} />
        </TabsContent>

        {["analysis", "solutions", "design", "planning"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <Card className="h-[400px] flex flex-col items-center justify-center text-center opacity-70 border-dashed">
              <CardHeader>
                <CardTitle className="capitalize">{tab} Module</CardTitle>
                <CardDescription>This workspace capability is currently being constructed.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
