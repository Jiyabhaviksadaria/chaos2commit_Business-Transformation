"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Building, FileText, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Project } from "@prisma/client"

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch {
      toast.error("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  const loadDemo = async () => {
    setLoadingDemo(true)
    try {
      const res = await fetch("/api/demo/load", { method: "POST" })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      toast.success("Demo project loaded!")
      router.push(`/projects/${data.data.projectId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo")
      setLoadingDemo(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your transformation workspaces and AI deliverables.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadDemo} disabled={loadingDemo} className="gap-2">
            {loadingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Load Demo Project
          </Button>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse h-48 bg-muted/20" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
          <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Building className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-medium mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Create your first project to start analyzing processes and generating deliverables.
          </p>
          <Link href="/projects/new">
            <Button>Create Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex flex-shrink-0 items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                    {project.status.toLowerCase()}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-1" title={project.name}>{project.name}</CardTitle>
                <CardDescription className="line-clamp-1">{project.industry || "No industry specified"}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 border-t">
                <Link href={`/projects/${project.id}`} className="w-full">
                  <Button variant="ghost" className="w-full flex justify-between group-hover:bg-primary/5">
                    Open Project
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
