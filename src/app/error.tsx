"use client"

import React, { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Unhandled Global Error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#F7F4EB] text-neutral-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-[#E5DFD4] rounded-[28px] p-8 shadow-sm text-center space-y-5">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            An unexpected error occurred while rendering this section. The application state has been preserved.
          </p>
        </div>

        {error?.message && (
          <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl text-left font-mono text-[11px] text-neutral-700 overflow-x-auto">
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            className="bg-[#18181C] hover:bg-neutral-800 text-white font-bold text-xs rounded-full h-10 px-5 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </Button>

          <Button
            onClick={() => (window.location.href = "/projects")}
            variant="outline"
            className="border-[#E5DFD4] font-bold text-xs rounded-full h-10 px-5 gap-2 text-neutral-700"
          >
            <Home className="h-3.5 w-3.5" /> Back to Workspace
          </Button>
        </div>
      </div>
    </div>
  )
}
