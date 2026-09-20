"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import type { FieldData } from "@/modules/deliverables/system-spec"

type RecordRow = { id: string; projectId?: string; moduleKey?: string; data: Record<string, unknown>; createdAt?: string }

export function KanbanView({
  fields,
  kanbanField,
  records,
  onMove,
  onEdit
}: {
  fields: FieldData[]
  kanbanField: string
  records: RecordRow[]
  onMove: (recordId: string, newValue: string) => Promise<void>
  onEdit: (r: RecordRow) => void
}) {
  const kField = fields.find(f => f.key === kanbanField)
  const columns = kField?.options ?? []
  const nameField = fields.find(f => f.key === "name" || f.key === "company_name" || f.key === "client_name" || f.type === "text")

  const getRecordName = (r: RecordRow) => {
    if (nameField) return String(r.data[nameField.key] ?? "Record")
    const firstText = fields.find(f => f.type === "text")
    if (firstText) return String(r.data[firstText.key] ?? "Record")
    return r.id.slice(0, 8)
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map(col => {
          const colRecords = records.filter(r => r.data[kanbanField] === col)
          return (
            <div key={col} className="w-64 flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-semibold text-sm">{col}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colRecords.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
                {colRecords.map(r => (
                  <Card key={r.id} className="shadow-sm">
                    <CardContent className="pt-3 pb-2 px-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{getRecordName(r)}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => onEdit(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="mt-2">
                        <Select value={col} onValueChange={val => onMove(r.id, val)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {colRecords.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">Empty</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
