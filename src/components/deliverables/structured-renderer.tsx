"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Generic renderer: arrays of objects → table, string arrays → list,
 * numbers 1-5 → score bar, nested objects → card sections.
 */
export function StructuredRenderer({ data, title }: { data: unknown; title?: string }) {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <RenderValue value={data} depth={0} />
    </div>
  )
}

function RenderValue({ value, label, depth }: { value: unknown; label?: string; depth: number }) {
  if (value === null || value === undefined) return null

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-sm font-medium text-muted-foreground">{humanize(label)}:</span>}
        <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
      </div>
    )
  }

  if (typeof value === "number") {
    if (value >= 1 && value <= 5 && Number.isInteger(value)) {
      return (
        <div className="flex items-center gap-2">
          {label && <span className="text-sm font-medium text-muted-foreground">{humanize(label)}:</span>}
          <ScoreBar score={value} max={5} />
        </div>
      )
    }
    if (value >= 0 && value <= 100) {
      return (
        <div className="flex items-center gap-2">
          {label && <span className="text-sm font-medium text-muted-foreground">{humanize(label)}:</span>}
          <span className="font-semibold">{value}</span>
          <div className="flex-1 max-w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${value}%` }} />
          </div>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-sm font-medium text-muted-foreground">{humanize(label)}:</span>}
        <span>{value}</span>
      </div>
    )
  }

  if (typeof value === "string") {
    const priorityColors: Record<string, string> = {
      MUST: "destructive", HIGH: "destructive",
      SHOULD: "default", MEDIUM: "default",
      COULD: "secondary", LOW: "secondary"
    }
    if (priorityColors[value]) {
      return (
        <div className="flex items-center gap-2">
          {label && <span className="text-sm font-medium text-muted-foreground">{humanize(label)}:</span>}
          <Badge variant={priorityColors[value] as "default" | "secondary" | "destructive" | "outline"}>{value}</Badge>
        </div>
      )
    }
    return (
      <div className="flex items-start gap-2">
        {label && <span className="text-sm font-medium text-muted-foreground shrink-0">{humanize(label)}:</span>}
        <span className="text-sm">{value}</span>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null

    // Array of objects → table
    if (typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0])) {
      const keys = Object.keys(value[0] as Record<string, unknown>).slice(0, 8)
      return (
        <div>
          {label && <h3 className="font-semibold mb-2 capitalize">{humanize(label)}</h3>}
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {keys.map(k => <TableHead key={k}>{humanize(k)}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.map((row, i) => (
                  <TableRow key={i}>
                    {keys.map(k => (
                      <TableCell key={k} className="text-sm max-w-[200px]">
                        <RenderCell value={(row as Record<string, unknown>)[k]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )
    }

    // Array of strings → list
    return (
      <div>
        {label && <h3 className="font-semibold mb-2 capitalize">{humanize(label)}</h3>}
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {(value as string[]).map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      </div>
    )
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)

    if (depth === 0) {
      return (
        <div className="space-y-6">
          {entries.map(([k, v]) => (
            <div key={k}>
              {typeof v === "object" || Array.isArray(v) ? (
                <RenderValue value={v} label={k} depth={depth + 1} />
              ) : (
                <RenderValue value={v} label={k} depth={depth + 1} />
              )}
            </div>
          ))}
        </div>
      )
    }

    return (
      <Card>
        {label && <CardHeader className="pb-2"><CardTitle className="text-base capitalize">{humanize(label)}</CardTitle></CardHeader>}
        <CardContent className={label ? "pt-0" : "pt-4"}>
          <div className="space-y-2">
            {entries.map(([k, v]) => (
              <RenderValue key={k} value={v} label={k} depth={depth + 1} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return <span className="text-sm">{String(value)}</span>
}

function RenderCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground/40">—</span>
  if (typeof value === "boolean") return <Badge variant={value ? "default" : "secondary"} className="text-xs">{value ? "Yes" : "No"}</Badge>
  if (typeof value === "number" && value >= 1 && value <= 5) return <ScoreBar score={value} max={5} />
  if (Array.isArray(value)) return <span className="text-xs text-muted-foreground">{value.length} items</span>
  if (typeof value === "object") return <span className="text-xs text-muted-foreground">object</span>
  const s = String(value)
  const colors: Record<string, string> = { MUST: "destructive", HIGH: "destructive", SHOULD: "default", COULD: "secondary", LOW: "secondary" }
  if (colors[s]) return <Badge variant={colors[s] as "default" | "secondary" | "destructive" | "outline"} className="text-xs">{s}</Badge>
  return <span className="line-clamp-2">{s}</span>
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`w-4 h-4 rounded-sm ${i < score ? color : "bg-muted"}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{score}/{max}</span>
    </div>
  )
}

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/^\w/, c => c.toUpperCase()).trim()
}
