"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft, Plus, Search, Download } from "lucide-react"
import { toast } from "sonner"
import type { SystemSpecData, FieldData } from "@/modules/deliverables/system-spec"
import { RecordTable } from "@/components/system/record-table"
import { RecordDialog } from "@/components/system/record-dialog"
import { KanbanView } from "@/components/system/kanban-view"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type RecordRow = { id: string; projectId?: string; moduleKey?: string; data: Record<string, unknown>; createdAt?: string }

export default function ModuleRuntimePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const moduleKey = params.moduleKey as string

  const [mod, setMod] = useState<SystemSpecData["modules"][0] | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<RecordRow | null>(null)

  const fetchMod = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC`)
    if (!res.ok) return
    const d = await res.json()
    if (d?.currentVersionId) {
      const vRes = await fetch(`/api/projects/${projectId}/deliverables/SYSTEM_SPEC/versions/${d.currentVersionId}`)
      if (vRes.ok) {
        const v = await vRes.json()
        const spec = v.content as SystemSpecData
        setMod(spec?.modules?.find(m => m.key === moduleKey) ?? null)
      }
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
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <p className="mt-4 text-muted-foreground">Module &ldquo;{moduleKey}&rdquo; not found in system spec.</p>
      </div>
    )
  }

  const hasKanban = mod?.views?.includes("kanban") && mod.kanbanField
  const hasAttendance = mod?.quickActions?.includes("CHECK_IN_OUT")

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}/system`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{mod?.name ?? moduleKey}</h1>
            <p className="text-sm text-muted-foreground">{total} records</p>
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

      <div className="flex gap-3 mb-4">
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
