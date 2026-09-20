"use client"

import * as React from "react"
import { DiffResult } from "@/lib/diff"

export function DeliverableDiff({ diffs, showUnchanged }: { diffs: DiffResult[], showUnchanged: boolean }) {
  // Filter if not showUnchanged
  const visible = showUnchanged ? diffs : diffs.filter(d => d.type !== "unchanged")

  if (visible.length === 0) {
    return <div className="text-muted-foreground p-4 text-center">No changes found between versions.</div>
  }

  return (
    <div className="flex flex-col space-y-2 font-mono text-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sticky top-0 bg-background pt-2 pb-4 font-bold border-b z-10">
        <div>Old Version</div>
        <div>New Version</div>
      </div>
      
      {visible.map(diff => (
        <div key={diff.path} className="flex flex-col mb-4 border-b pb-4">
          <div className="font-semibold text-muted-foreground mb-1 select-all">{diff.path}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left side: Old Value (or removed highlight) */}
            <div className={`p-2 rounded ${diff.type === "removed" ? "bg-red-500/10 dark:bg-red-500/20" : ""}`}>
              {diff.type === "added" ? (
                <span className="text-muted-foreground italic">Not present</span>
              ) : diff.type === "changed" && diff.diffBlocks ? (
                <div>
                  {diff.diffBlocks.map((block, i) => {
                    if (block.added) return null
                    if (block.removed) return <span key={i} className="bg-red-500/20 text-red-700 dark:text-red-300 rounded px-0.5 line-through">{block.value}</span>
                    return <span key={i}>{block.value}</span>
                  })}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{JSON.stringify(diff.oldValue, null, 2)}</pre>
              )}
            </div>

            {/* Right side: New Value (or added highlight) */}
            <div className={`p-2 rounded ${diff.type === "added" ? "bg-green-500/10 dark:bg-green-500/20" : ""}`}>
              {diff.type === "removed" ? (
                <span className="text-muted-foreground italic">Removed</span>
              ) : diff.type === "changed" && diff.diffBlocks ? (
                <div>
                  {diff.diffBlocks.map((block, i) => {
                    if (block.removed) return null
                    if (block.added) return <span key={i} className="bg-green-500/20 text-green-700 dark:text-green-300 rounded px-0.5 font-bold">{block.value}</span>
                    return <span key={i}>{block.value}</span>
                  })}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">{JSON.stringify(diff.newValue, null, 2)}</pre>
              )}
            </div>

          </div>
        </div>
      ))}
    </div>
  )
}
