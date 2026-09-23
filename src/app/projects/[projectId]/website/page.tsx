"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function WebsitePageRedirect() {
  const params = useParams()
  const router = useRouter()
  const projectId = (params?.projectId as string) || ""

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/editor`)
    }
  }, [projectId, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-800" />
      <span className="text-xs font-bold text-neutral-600">Opening Visual Website Editor...</span>
    </div>
  )
}
