"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft, Plus, Search, Download, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import type { SystemSpecData, FieldData } from "@/modules/deliverables/system-spec"
import { RecordTable } from "@/components/system/record-table"
import { RecordDialog } from "@/components/system/record-dialog"
import { KanbanView } from "@/components/system/kanban-view"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type RecordRow = { id: string; projectId?: string; moduleKey?: string; data: Record<string, unknown>; createdAt?: string }

interface ModuleConfig {
  key: string
  name: string
  description?: string
  icon?: string
  views?: string[]
  kanbanField?: string
  quickActions?: string[]
  fields: FieldData[]
}

export default function ModuleRuntimePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const moduleKey = params.moduleKey as string

  const [mod, setMod] = useState<ModuleConfig | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<RecordRow | null>(null)
  const [unsupportedFieldNotice, setUnsupportedFieldNotice] = useState<string | null>(null)
  const [traceableRequirement, setTraceableRequirement] = useState<string | null>(null)

  const fetchMod = useCallback(async () => {
    try {
      // 1. Priority 1: Fetch Approved Blueprint
      const bpRes = await fetch(`/api/projects/${projectId}/blueprint`)
      if (bpRes.ok) {
        const bpData = await bpRes.json()
        const bp = bpData.blueprint
        if (bp?.modules) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bpMod = bp.modules.find((m: any) => m.key === moduleKey || m.key.toLowerCase() === moduleKey.toLowerCase())
          if (bpMod) {
            // Map entity fields
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entity = bp.dataEntities?.find((e: any) =>
              e.name.toLowerCase() === bpMod.name.toLowerCase() ||
              e.name.toLowerCase().includes(bpMod.key.toLowerCase()) ||
              bpMod.key.toLowerCase().includes(e.name.toLowerCase())
            )

            let fields: FieldData[] = []
            if (entity?.fields && entity.fields.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fields = entity.fields.map((f: any) => {
                const raw = typeof f === "string" ? f : f.name || f.key || "field"
                const fieldKey = raw.toLowerCase().replace(/[^a-z0-9]/g, "_")
                let type: FieldData["type"] = "text"

                if (fieldKey.includes("date") || fieldKey.includes("time")) type = "date"
                else if (fieldKey.includes("amount") || fieldKey.includes("price") || fieldKey.includes("cost") || fieldKey.includes("score")) type = "currency"
                else if (fieldKey.includes("count") || fieldKey.includes("qty") || fieldKey.includes("num")) type = "number"
                else if (fieldKey.includes("is_") || fieldKey.includes("has_") || fieldKey.includes("flag")) type = "boolean"
                else if (fieldKey.includes("status") || fieldKey.includes("stage") || fieldKey.includes("priority")) type = "select"
                else if (fieldKey.includes("email")) type = "email"
                else if (fieldKey.includes("phone")) type = "phone"

                return {
                  key: fieldKey,
                  label: raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, " "),
                  type,
                  options: type === "select" ? ["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"] : undefined,
                  required: fieldKey === "id" || fieldKey === "title" || fieldKey === "name",
                  showInTable: true
                }
              })
            }

            if (fields.length === 0) {
              fields = [
                { key: "name", label: "Name / Title", type: "text", required: true, showInTable: true },
                { key: "status", label: "Status", type: "select", options: ["ACTIVE", "PENDING", "COMPLETED", "CANCELLED"], required: false, showInTable: true },
                { key: "description", label: "Description", type: "textarea", required: false, showInTable: true },
                { key: "assigned_to", label: "Assigned To", type: "text", required: false, showInTable: true }
              ]
            }

            const kanbanField = fields.find(f => f.key === "status" || f.key.includes("stage"))?.key
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const req = bp.requirements?.find((r: any) =>
              r.title.toLowerCase().includes(bpMod.name.toLowerCase()) ||
              r.description.toLowerCase().includes(bpMod.name.toLowerCase())
            )

            if (req) {
              setTraceableRequirement(`[${req.id}] ${req.title} — ${req.description}`)
            }

            setMod({
              key: bpMod.key,
              name: bpMod.name,
              description: bpMod.description,
              icon: bpMod.icon || "Box",
              views: kanbanField ? ["table", "kanban"] : ["table"],
              kanbanField,
              fields
            })
            return
          }
        }
      }

      // 2. Priority 2: SYSTEM_SPEC deliverable
      const res = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC`)
      if (res.ok) {
        const d = await res.json()
        if (d?.currentVersionId) {
          const vRes = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${d.currentVersionId}`)
          if (vRes.ok) {
            const v = await vRes.json()
            const spec = v.content as SystemSpecData
            const found = spec?.modules?.find(m => m.key === moduleKey)
            if (found) {
              setMod(found)
              return
            }
          }
        }
      }

      // 3. Fallback: Generic module
      setMod({
        key: moduleKey,
        name: moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1).replace(/_/g, " "),
        description: `Generic module runtime for ${moduleKey}`,
        icon: "Box",
        views: ["table"],
        fields: [
          { key: "title", label: "Title", type: "text", required: true, showInTable: true },
          { key: "status", label: "Status", type: "select", options: ["ACTIVE", "PENDING", "COMPLETED"], required: false, showInTable: true },
          { key: "description", label: "Description", type: "textarea", required: false, showInTable: true }
        ]
      })
    } catch {
      toast.error("Failed to load module runtime configuration")
    }
  }, [projectId, moduleKey])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/records/${moduleKey}?page=${page}&pageSize=20&search=${encodeURIComponent(search)}`)
      if (res.ok) {
        const d = await res.json()
        setRecords((d.data ?? []) as RecordRow[])
        setTotal(d.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, moduleKey, page, search])

  useEffect(() => { fetchMod() }, [fetchMod])
  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleSave = async (data: Record<string, unknown>, id?: string) => {
    const url = id
      ? `/api/projects/${projectId}/records/${moduleKey}/${id}`
      : `/api/projects/${projectId}/records/${moduleKey}`
    const method = id ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? "Save failed")
    }
    toast.success(id ? "Record updated" : "Record created")
    setDialogOpen(false)
    setEditRecord(null)
    fetchRecords()
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/projects/${projectId}/records/${moduleKey}/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Delete failed"); return }
    toast.success("Record deleted")
    fetchRecords()
  }

  const handleCheckInOut = async () => {
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toISOString()
    const existing = records.find(r => r.data.date === today)
    if (existing) {
      if (!existing.data.check_out) {
        await handleSave({ ...existing.data, check_out: now }, existing.id)
        toast.success("Checked out!")
      } else {
        toast.info("Already checked in and out today")
      }
    } else {
      await handleSave({ date: today, check_in: now, status: "Present" })
      toast.success("Checked in!")
    }
  }

  const exportCsv = () => {
    if (!mod || records.length === 0) return
    const tableFields = mod.fields.filter(f => f.showInTable)
    const headers = tableFields.map(f => f.label).join(",")
    const rows = records.map(r => tableFields.map(f => {
      const val = r.data[f.key]
      return `"${String(val ?? "").replace(/"/g, '""')}"`
    }).join(","))
    const csv = [headers, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${moduleKey}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (!mod && !loading) {
    return (
      <div className="container mx-auto py-8 px-4 font-sans">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="mt-4 text-muted-foreground">Module &ldquo;{moduleKey}&rdquo; not found in system spec.</p>
      </div>
    )
  }

  const hasKanban = mod?.views?.includes("kanban") && Boolean(mod.kanbanField)
  const hasAttendance = mod?.quickActions?.includes("CHECK_IN_OUT")

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}/system`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Modules
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{mod?.name ?? moduleKey}</h1>
              <Badge variant="outline" className="text-xs font-mono">{records.length} records</Badge>
            </div>
            {mod?.description && <p className="text-xs text-neutral-500 mt-0.5">{mod.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {hasAttendance && (
            <Button variant="outline" onClick={handleCheckInOut}>Check In / Out</Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button onClick={() => { setEditRecord(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" /> Add Record
          </Button>
        </div>
      </div>

      {/* Requirement Traceability Banner */}
      {traceableRequirement && (
        <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-neutral-800">Traceable Requirement:</span>
            <span className="text-neutral-600 font-medium">{traceableRequirement}</span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-900 border-none font-bold text-[10px]">
            BLUEPRINT LINKED
          </Badge>
        </div>
      )}

      {/* Unsupported Field Warning Banner */}
      {unsupportedFieldNotice && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-center justify-between font-medium">
          <span>{unsupportedFieldNotice}</span>
          <Button variant="ghost" size="sm" onClick={() => setUnsupportedFieldNotice(null)} className="text-xs">Dismiss</Button>
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
      </div>

      {loading && <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && mod && (
        <>
          {hasKanban ? (
            <Tabs defaultValue="table">
              <TabsList className="mb-4">
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
              </TabsList>
              <TabsContent value="table">
                <RecordTable
                  fields={mod.fields.filter(f => f.showInTable)}
                  records={records}
                  onEdit={r => { setEditRecord(r); setDialogOpen(true) }}
                  onDelete={handleDelete}
                />
              </TabsContent>
              <TabsContent value="kanban">
                <KanbanView
                  fields={mod.fields}
                  kanbanField={mod.kanbanField!}
                  records={records}
                  onMove={async (recordId, newValue) => {
                    const r = records.find(x => x.id === recordId)
                    if (!r) return
                    await handleSave({ ...r.data, [mod.kanbanField!]: newValue }, recordId)
                  }}
                  onEdit={r => { setEditRecord(r); setDialogOpen(true) }}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <RecordTable
              fields={mod.fields.filter(f => f.showInTable)}
              records={records}
              onEdit={r => { setEditRecord(r); setDialogOpen(true) }}
              onDelete={handleDelete}
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Showing {records.length} of {total}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Badge variant="outline">Page {page}</Badge>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      {mod && (
        <RecordDialog
          open={dialogOpen}
          fields={mod.fields as FieldData[]}
          record={editRecord}
          onClose={() => { setDialogOpen(false); setEditRecord(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
