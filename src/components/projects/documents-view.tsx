"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  UploadCloud,
  File,
  Trash2,
  Loader2,
  Eye,
  FileText,
  ArrowRight,
  FileSpreadsheet,
  Presentation,
  FileCode,
  RotateCw,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { Document } from "@prisma/client"
import { MAX_DOCUMENTS_PER_PROJECT } from "@/lib/intake/constants"

function getDocIcon(filename: string) {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".pdf")) return <FileText className="h-5 w-5 text-rose-600" />
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
  if (lower.endsWith(".pptx")) return <Presentation className="h-5 w-5 text-amber-600" />
  if (lower.endsWith(".md") || lower.endsWith(".txt")) return <FileCode className="h-5 w-5 text-sky-600" />
  return <File className="h-5 w-5 text-neutral-600" />
}

export function DocumentsView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [retryingDocId, setRetryingDocId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`)
      if (res.ok) {
        setDocuments(await res.json())
      }
    } catch {
      toast.error("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const availableSlots = Math.max(0, MAX_DOCUMENTS_PER_PROJECT - documents.length)
    if (files.length > availableSlots) {
      toast.error(`You can only add ${availableSlots} more document(s) (Maximum: ${MAX_DOCUMENTS_PER_PROJECT}).`)
      return
    }

    setUploading(true)
    setUploadProgress(20)

    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))

    try {
      setUploadProgress(50)
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "File upload failed")
      }

      setUploadProgress(100)
      const count = data.readyCount ?? (Array.isArray(data.documents) ? data.documents.length : 1)
      toast.success(`${count} document(s) uploaded and processed into business evidence!`)
      fetchDocuments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error uploading files")
      fetchDocuments()
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files) {
      handleFilesUpload(event.dataTransfer.files)
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Document removed from project evidence")
      setDocuments(documents.filter((d) => d.id !== docId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting document")
    }
  }

  const handleTriggerRetry = (docId: string) => {
    setRetryingDocId(docId)
    retryInputRef.current?.click()
  }

  const handleExecuteRetry = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !retryingDocId) return

    const toastId = toast.loading(`Retrying extraction for ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/projects/${projectId}/documents/${retryingDocId}/retry`, {
        method: "POST",
        body: formData,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Retry failed")
      toast.success("Document re-processed successfully!", { id: toastId })
      fetchDocuments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Retry failed", { id: toastId })
    } finally {
      setRetryingDocId(null)
      if (retryInputRef.current) retryInputRef.current.value = ""
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const readyDocsCount = documents.filter((d) => d.status === "READY").length
  const failedDocsCount = documents.filter((d) => d.status === "FAILED").length

  return (
    <div className="space-y-6 font-sans">
      <Card
        className="border-dashed border-[#E5DFD4] bg-white rounded-[26px] hover:border-neutral-400 transition-colors"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <UploadCloud className="h-10 w-10 text-neutral-400 mb-3" />
          <h3 className="text-base font-extrabold text-neutral-900 mb-1">Upload Business Evidence Documents</h3>
          <p className="text-xs text-neutral-500 mb-4 max-w-lg">
            Drag and drop multiple files or click to add supporting business documentation (PDF, DOCX, XLSX, XLS, CSV, PPTX, TXT, MD up to 10MB each).
          </p>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="border-[#E5DFD4] text-[10px] font-bold">
              {documents.length}/{MAX_DOCUMENTS_PER_PROJECT} documents added
            </Badge>
            {documents.length > 0 && (
              <span className="text-[11px] text-neutral-500">
                ({readyDocsCount} ready, {failedDocsCount} failed)
              </span>
            )}
          </div>

          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
            className="hidden"
            accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls,.txt,.md,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          />

          <input
            type="file"
            ref={retryInputRef}
            onChange={handleExecuteRetry}
            className="hidden"
            accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls,.txt,.md"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || documents.length >= MAX_DOCUMENTS_PER_PROJECT}
            className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2 shadow"
          >
            {uploading ? "Extracting Evidence..." : "+ Add Supporting Documents"}
          </Button>

          {uploading && (
            <div className="w-full max-w-xs mt-6 space-y-2">
              <div className="flex justify-between text-xs font-bold text-neutral-700">
                <span>Uploading & Parsing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 bg-neutral-100" />
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin h-6 w-6 text-neutral-500" />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-sm text-neutral-900">
              Project Evidence Documents ({documents.length})
            </h4>
            <span className="text-[11px] text-neutral-500">
              {readyDocsCount} of {documents.length} ready for Business Discovery
            </span>
          </div>

          {/* SCROLLABLE DOCUMENT LIST (Supports 10-20 files cleanly) */}
          <div className="max-h-[460px] overflow-y-auto border border-[#E5DFD4] rounded-2xl divide-y divide-[#E5DFD4] bg-white shadow-sm">
            {documents.map((doc) => {
              const meta = (doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {}) as Record<string, unknown>
              const pageCount = typeof meta.pageCount === "number" ? meta.pageCount : null
              const sheetNames = Array.isArray(meta.sheetNames) ? meta.sheetNames : []
              const slideCount = typeof meta.slideCount === "number" ? meta.slideCount : null
              const rowCount = typeof meta.rowCount === "number" ? meta.rowCount : null

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 hover:bg-[#FAF8F2] transition-colors gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-[#FAF8F2] border border-[#E5DFD4] flex items-center justify-center shrink-0">
                      {getDocIcon(doc.filename)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-xs text-neutral-900 truncate max-w-md">{doc.filename}</h5>
                        {doc.status === "READY" && (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-900 border-none font-bold">
                            READY
                          </Badge>
                        )}
                        {doc.status === "PENDING" && (
                          <Badge variant="secondary" className="text-[9px] font-bold">
                            PROCESSING
                          </Badge>
                        )}
                        {doc.status === "FAILED" && (
                          <Badge className="text-[9px] bg-red-100 text-red-900 border-none font-bold">
                            EXTRACTION FAILED
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-500">
                        <span>{formatSize(doc.sizeBytes)}</span>
                        {pageCount && <span>• {pageCount} page(s)</span>}
                        {sheetNames.length > 0 && <span>• {sheetNames.length} sheet(s)</span>}
                        {slideCount && <span>• {slideCount} slide(s)</span>}
                        {rowCount && <span>• {rowCount} row(s)</span>}
                        {doc.extractedText && <span>• {doc.extractedText.length.toLocaleString()} chars</span>}
                        {doc.error && (
                          <span className="text-red-600 font-semibold truncate max-w-xs" title={doc.error}>
                            • {doc.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.status === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTriggerRetry(doc.id)}
                        className="border-red-200 text-red-800 hover:bg-red-50 text-xs font-bold rounded-full gap-1"
                      >
                        <RotateCw className="h-3 w-3" /> Retry
                      </Button>
                    )}

                    {doc.status === "READY" && !!doc.extractedText && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewDoc(doc)}
                          className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Preview Evidence
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/projects/${projectId}/documents/${doc.id}`)}
                          className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-neutral-400 hover:text-red-600 rounded-full h-8 w-8"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-extrabold text-[#18181C]">
              {previewDoc && getDocIcon(previewDoc.filename)} {previewDoc?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 text-xs bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-6">
            {previewDoc?.summary && (
              <div>
                <h4 className="font-extrabold text-neutral-900 mb-2">Executive Business Summary</h4>
                <p className="bg-white p-3.5 rounded-xl border border-[#E5DFD4] text-neutral-800 leading-relaxed font-medium">
                  {previewDoc.summary}
                </p>
              </div>
            )}
            <div>
              <h4 className="font-extrabold text-neutral-900 mb-2">Normalized Business Evidence (with Provenance)</h4>
              <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-mono text-[11px] bg-[#18181C] text-neutral-200 p-4 rounded-xl max-h-[340px] overflow-y-auto">
                {previewDoc?.extractedText}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
