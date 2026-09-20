"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2 } from "lucide-react"
import type { FieldData } from "@/modules/deliverables/system-spec"

type RecordRow = { id: string; projectId?: string; moduleKey?: string; data: Record<string, unknown>; createdAt?: string }

export function RecordTable({
  fields,
  records,
  onEdit,
  onDelete
}: {
  fields: FieldData[]
  records: RecordRow[]
  onEdit: (r: RecordRow) => void
  onDelete: (id: string) => void
}) {
  if (records.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        No records yet. Click &ldquo;Add Record&rdquo; to get started.
      </div>
    )
  }

  const formatValue = (field: FieldData, value: unknown): React.ReactNode => {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground/50">—</span>
    if (field.type === "boolean") return value ? <Badge variant="default" className="text-xs">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>
    if (field.type === "select") return <Badge variant="outline" className="text-xs">{String(value)}</Badge>
    if (field.type === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(Number(value))
    if (field.type === "date") return new Date(String(value)).toLocaleDateString()
    if (field.type === "datetime") return new Date(String(value)).toLocaleString()
    return String(value).slice(0, 60)
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {fields.map(f => <TableHead key={f.key}>{f.label}</TableHead>)}
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map(r => (
            <TableRow key={r.id}>
              {fields.map(f => (
                <TableCell key={f.key} className="max-w-[200px] truncate">
                  {formatValue(f, r.data[f.key])}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
