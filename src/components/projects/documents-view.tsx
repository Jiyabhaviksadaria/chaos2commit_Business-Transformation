"use client"

import React, { useState, useEffect, useRef } from "react"
import { UploadCloud, File, Trash2, Loader2, Eye, FileText, ArrowRight } from "lucide-react"
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

export function DocumentsView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      const input = fileInputRef.current
      if (input) {
        const transfer = new DataTransfer()
        transfer.items.add(file)
        input.files = transfer.files
        input.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(20)

    const formData = new FormData()
    formData.append("file", file)

    try {
      setUploadProgress(50)
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "File upload failed")
      }
      
      setUploadProgress(100)
      toast.success("Document uploaded and extracted!")
      fetchDocuments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error uploading file")
      fetchDocuments()
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Document deleted")
      setDocuments(documents.filter(d => d.id !== docId))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting")
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className="space-y-6 font-sans">
      <Card className="border-dashed border-[#E5DFD4] bg-white rounded-[26px]" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          <UploadCloud className="h-10 w-10 text-neutral-400 mb-3" />
          <h3 className="text-base font-extrabold text-neutral-900 mb-1">Upload Business Documentation</h3>
          <p className="text-xs text-neutral-500 mb-6 max-w-md">
            Drag and drop or select files (PDF, DOCX, PPTX, CSV, XLSX, TXT, MD) up to 10MB. Content will be parsed for contextual AI analysis.
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
            accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls,.txt,.md,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full px-6 py-2">
            {uploading ? "Extracting Data..." : "Select File"}
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
        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-neutral-500" /></div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-extrabold text-base text-neutral-900">Project Documents ({documents.length})</h4>
          <div className="border border-[#E5DFD4] rounded-2xl divide-y divide-[#E5DFD4] bg-white overflow-hidden">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-[#FAF8F2] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-[#FAF8F2] border border-[#E5DFD4] flex items-center justify-center text-neutral-800 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-neutral-900">{doc.filename}</h5>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                      <span>{formatSize(doc.sizeBytes)}</span>
                      <span>•</span>
                      {doc.status === "READY" && <Badge className="text-[10px] bg-emerald-100 text-emerald-900 border-none font-bold">READY</Badge>}
                      {doc.status === "PENDING" && <Badge variant="secondary" className="text-[10px] font-bold">PROCESSING</Badge>}
                      {doc.status === "FAILED" && <Badge className="text-[10px] bg-red-100 text-red-900 border-none font-bold">FAILED</Badge>}
                      {doc.error && <span className="text-red-600 truncate max-w-[200px]" title={doc.error}>- {doc.error}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(doc.status === "READY" && !!doc.extractedText) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setPreviewDoc(doc)} className="border-[#E5DFD4] text-xs font-bold rounded-full gap-1">
                        <Eye className="h-3.5 w-3.5" /> Quick Preview
                      </Button>
                      <Button variant="default" size="sm" onClick={() => router.push(`/projects/${projectId}/documents/${doc.id}`)} className="bg-[#18181C] hover:bg-neutral-800 text-white text-xs font-bold rounded-full gap-1">
                        <span>Inspect & AI Q&A</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-red-600 rounded-full" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-extrabold text-[#18181C]">
              <File className="h-4 w-4 text-neutral-800" /> {previewDoc?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 text-xs bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl space-y-6">
            {previewDoc?.summary && (
              <div className="mb-4">
                <h4 className="font-extrabold text-neutral-900 mb-2">AI Summary</h4>
                <p className="bg-white p-3 rounded-xl border border-[#E5DFD4] text-neutral-800 leading-relaxed font-medium">
                  {previewDoc.summary}
                </p>
              </div>
            )}
            <div>
              <h4 className="font-extrabold text-neutral-900 mb-2">Raw Extracted Text</h4>
              <div className="whitespace-pre-wrap font-mono text-[11px] bg-[#18181C] text-neutral-200 p-4 rounded-xl max-h-[300px] overflow-y-auto">
                {previewDoc?.extractedText}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
