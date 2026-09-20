"use client"

import React, { useState, useEffect, useRef } from "react"
import { UploadCloud, File, Trash2, Loader2, Eye, FileText } from "lucide-react"
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
      fetchDocuments() // fetch anyway to show failed state
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
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">Upload Project Documentation</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Drag and drop or select files (PDF, DOCX, PPTX, TXT, MD) up to 10MB. Text will be extracted for AI contextual analysis.
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
            accept=".pdf,.docx,.pptx,.txt,.md,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Extracting Data..." : "Select File"}
          </Button>

          {uploading && (
            <div className="w-full max-w-xs mt-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span>Uploading & Parsing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Project Files ({documents.length})</h4>
          <div className="border rounded-md divide-y">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">{doc.filename}</h5>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{formatSize(doc.sizeBytes)}</span>
                      <span>•</span>
                      {doc.status === "READY" && <Badge variant="secondary" className="text-[10px] h-4 bg-green-500/10 text-green-600 hover:bg-green-500/20">READY</Badge>}
                      {doc.status === "PENDING" && <Badge variant="secondary" className="text-[10px] h-4">PROCESSING</Badge>}
                      {doc.status === "FAILED" && <Badge variant="destructive" className="text-[10px] h-4">FAILED</Badge>}
                      {doc.error && <span className="text-red-500 truncate max-w-[200px]" title={doc.error}>- {doc.error}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(doc.status === "READY" && !!doc.extractedText) && (
                    <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(doc)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(doc.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-4 w-4 text-primary" /> {previewDoc?.filename}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 text-sm bg-muted/30 p-4 rounded-md space-y-6">
            {previewDoc?.summary && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center text-primary">
                  AI Summary
                </h4>
                <p className="italic bg-primary/5 p-3 rounded border border-primary/20">
                  {previewDoc.summary}
                </p>
              </div>
            )}
            <div>
               <h4 className="font-semibold mb-2">Raw Extracted Text</h4>
               <p className="whitespace-pre-wrap font-mono text-xs">{previewDoc?.extractedText}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
