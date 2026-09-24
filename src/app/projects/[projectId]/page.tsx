"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { ProjectWorkspace } from "@/components/projects/project-workspace"

export default function ProjectWorkspacePage() {
  return <Suspense fallback={<div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-neutral-800" /></div>}><ProjectWorkspace /></Suspense>
}
