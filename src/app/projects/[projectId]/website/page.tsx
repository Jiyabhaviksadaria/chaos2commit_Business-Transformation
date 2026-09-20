"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, ExternalLink, Globe } from "lucide-react"
import { toast } from "sonner"
import { SiteRenderer } from "@/components/website/site-renderer"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { Card, CardDescription, CardTitle, CardHeader } from "@/components/ui/card"

export default function WebsitePreviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const [spec, setSpec] = useState<WebsiteSpecData | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [siteSlug, setSiteSlug] = useState<string | null>(null)

  const fetchSpec = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/deliverables/WEBSITE_SPEC`)
      if (!res.ok) throw new Error("No spec")
      const d = await res.json()
      if (d?.currentVersionId) {
        const vRes = await fetch(`/api/projects/${projectId}/deliverables/WEBSITE_SPEC/versions/${d.currentVersionId}`)
        if (vRes.ok) {
          const v = await vRes.json()
          setSpec(v.content as WebsiteSpecData)
        }
      }
      const pRes = await fetch(`/api/projects/${projectId}`)
      if (pRes.ok) {
        const p = await pRes.json()
        setSiteSlug(p.siteSlug)
      }
    } catch { /* no spec yet */ }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { fetchSpec() }, [fetchSpec])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, { method: "POST" })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error)
      setSiteSlug(d.siteSlug)
      toast.success("Site published!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  if (!spec) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Card className="border-dashed text-center p-12">
          <CardHeader>
            <CardTitle>No Website Built Yet</CardTitle>
            <CardDescription>Go to Discovery and click &ldquo;Build my systems&rdquo; to generate a website.</CardDescription>
          </CardHeader>
          <Button onClick={() => router.push(`/projects/${projectId}`)}>Build Systems</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-2 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <span className="font-semibold text-sm hidden sm:inline">{spec.siteName} — Website Preview</span>
        <div className="flex gap-2">
          {siteSlug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/site/${siteSlug}`, "_blank")} className="gap-2">
              <ExternalLink className="h-4 w-4" /> View Live
            </Button>
          )}
          <Button size="sm" onClick={handlePublish} disabled={publishing} className="gap-2">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {siteSlug ? "Republish" : "Publish Site"}
          </Button>
        </div>
      </div>
      <SiteRenderer spec={spec} preview={true} />
    </div>
  )
}
