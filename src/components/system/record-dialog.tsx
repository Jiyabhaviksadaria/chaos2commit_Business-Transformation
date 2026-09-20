"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import type { FieldData } from "@/modules/deliverables/system-spec"
import { toast } from "sonner"

type RecordRow = { id: string; projectId?: string; moduleKey?: string; data: Record<string, unknown>; createdAt?: string }

export function RecordDialog({
  open,
  fields,
  record,
  onClose,
  onSave
}: {
  open: boolean
  fields: FieldData[]
  record: RecordRow | null
  onClose: () => void
  onSave: (data: Record<string, unknown>, id?: string) => Promise<void>
}) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(record ? { ...record.data } : {})
    }
  }, [open, record])

  const set = (key: string, val: unknown) => setValues(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(values, record?.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Record" : "New Record"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {fields.map(f => (
            <FieldInput key={f.key} field={f} value={values[f.key]} onChange={val => set(f.key, val)} />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldInput({ field, value, onChange }: { field: FieldData; value: unknown; onChange: (v: unknown) => void }) {
  const strVal = value !== undefined && value !== null ? String(value) : ""

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Textarea id={field.key} value={strVal} onChange={e => onChange(e.target.value)} required={field.required} rows={3} />
        </div>
      )
    case "select":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Select value={strVal} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={`Select ${field.label}`} /></SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )
    case "boolean":
      return (
        <div className="flex items-center gap-3">
          <input type="checkbox" id={field.key} checked={Boolean(value)} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
          <Label htmlFor={field.key}>{field.label}</Label>
        </div>
      )
    case "checklist":
      return (
        <div className="space-y-1.5">
          <Label>{field.label}</Label>
          <Textarea
            value={strVal}
            onChange={e => onChange(e.target.value)}
            placeholder="Enter checklist items (one per line)"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">One item per line</p>
        </div>
      )
    case "number":
    case "currency":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="number" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    case "date":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="date" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    case "datetime":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="datetime-local" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    case "email":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="email" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    case "phone":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="tel" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    case "url":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} type="url" value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
    default:
      return (
        <div className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
          <Input id={field.key} value={strVal} onChange={e => onChange(e.target.value)} required={field.required} />
        </div>
      )
  }
}
