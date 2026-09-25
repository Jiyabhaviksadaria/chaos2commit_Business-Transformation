"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Loader2,
  Sparkles,
  FileCode,
  Tag,
  Clock,
  HardDrive
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface DocDetails {
  id: string
  projectId: string
  filename: string
  mimeType: string
  sizeBytes: number
  extractedText: string | null
  summary: string | null
  entities: string | null
  metadata: string | null
  status: string
  error: string | null
  createdAt: string
}

interface ChatMessage {
  role: "user" | "assistant"
  text: string
}

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const documentId = params.documentId as string

  const [doc, setDoc] = useState<DocDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Q&A state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! I am your Document Intelligence Assistant. Ask me anything about this ingested document."
    }
  ])
  const [inputQuestion, setInputQuestion] = useState("")
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    fetchDocument()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, documentId])

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${documentId}`)
      if (res.ok) {
        setDoc(await res.json())
      } else {
        throw new Error("Document not found")
      }
    } catch {
      toast.error("Failed to load document")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this document?")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        toast.success("Document deleted successfully")
        router.push(`/projects/${projectId}?tab=discovery`)
      } else {
        throw new Error("Failed to delete")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting document")
      setDeleting(false)
    }
  }

  const handleCopyText = () => {
    if (!doc?.extractedText) return
    navigator.clipboard.writeText(doc.extractedText)
    setCopied(true)
    toast.success("Extracted text copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendQuestion = async (qText?: string) => {
    const question = qText || inputQuestion
    if (!question.trim() || asking) return

    const newMsgs: ChatMessage[] = [...messages, { role: "user", text: question }]
    setMessages(newMsgs)
    if (!qText) setInputQuestion("")
    setAsking(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${documentId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      if (res.ok) {
        setMessages([...newMsgs, { role: "assistant", text: data.answer }])
      } else {
        throw new Error(data.error || "Q&A request failed")
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to get AI answer")
      setMessages([
        ...newMsgs,
        { role: "assistant", text: "Sorry, I encountered an issue analyzing this document question." }
      ])
    } finally {
      setAsking(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-800" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Document Not Found</h2>
        <Button onClick={() => router.push(`/projects/${projectId}`)} className="bg-[#18181C] text-white rounded-full">
          Back to Workspace
        </Button>
      </div>
    )
  }

  let entityList: string[] = []
  try {
    if (doc.entities) {
      entityList = typeof doc.entities === "string" ? JSON.parse(doc.entities) : doc.entities
    }
  } catch {
    entityList = []
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl font-sans space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E5DFD4] p-5 rounded-[24px] shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/projects/${projectId}?tab=discovery`)}
            className="rounded-full hover:bg-neutral-100"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-700" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-neutral-900">{doc.filename}</h1>
              <Badge variant={doc.status === "READY" ? "success" : "destructive"}>
                {doc.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-500 mt-1">
              <span className="flex items-center gap-1"><HardDrive className="h-3.5 w-3.5" /> {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
              <span className="flex items-center gap-1"><FileCode className="h-3.5 w-3.5" /> {doc.mimeType}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="border-red-200 text-red-700 hover:bg-red-50 gap-1.5"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Document
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Executive Overview + Right Interactive AI Q&A */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Summary, Entities, Raw Text */}
        <div className="lg:col-span-2 space-y-6">
          {/* Executive AI Summary Card */}
          <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#F472B6]" />
                  Executive AI Summary
                </span>
                <Badge variant="accent">Document Analysis</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Synthesized key takeaways and business purpose.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-4 rounded-2xl text-xs text-neutral-800 leading-relaxed font-medium">
                {doc.summary || "No executive summary available for this document."}
              </div>
            </CardContent>
          </Card>

          {/* Extracted Entities & Metadata */}
          {entityList.length > 0 && (
            <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-neutral-700" />
                  Extracted Entities & Domain Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entityList.map((ent, idx) => (
                    <Badge key={idx} variant="secondary">
                      {ent}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Raw Text Viewer */}
          <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-neutral-700" />
                  Extracted Text Content
                </CardTitle>
                <CardDescription className="text-xs">Full text extracted by server parsing engine.</CardDescription>
              </div>
              <Button onClick={handleCopyText} variant="outline" size="sm" className="gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Text
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-[#18181C] text-neutral-200 p-4 rounded-2xl font-mono text-xs max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {doc.extractedText || "No text content found."}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Interactive Document AI Q&A Panel */}
        <div className="space-y-6">
          <Card className="bg-white border-[#E5DFD4] rounded-[24px] shadow-xs h-[650px] flex flex-col justify-between overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#E5DFD4]">
              <CardTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                <Bot className="h-5 w-5 text-neutral-900" />
                Document AI Q&A
              </CardTitle>
              <CardDescription className="text-xs">Ask questions directly against this document.</CardDescription>
            </CardHeader>

            {/* Chat Conversation Stream */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 text-xs ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      m.role === "user"
                        ? "bg-[#18181C] text-white rounded-br-none"
                        : "bg-[#FAF8F2] border border-[#E5DFD4] text-neutral-800 rounded-bl-none"
                    }`}
                  >
                    <p className="leading-relaxed font-medium">{m.text}</p>
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex gap-2 justify-start">
                  <div className="bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-2xl flex items-center gap-2 text-xs text-neutral-500 font-bold">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing document content...
                  </div>
                </div>
              )}
            </CardContent>

            {/* Quick Prompt Suggestions + Input */}
            <div className="p-4 border-t border-[#E5DFD4] bg-[#FAF8F2] space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[
                  "What are the main risks?",
                  "Summarize key action items",
                  "List any mentioned technologies"
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuestion(chip)}
                    disabled={asking}
                    className="text-[10px] font-bold bg-white border border-[#E5DFD4] hover:bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-full transition-all"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendQuestion()
                }}
                className="flex gap-2"
              >
                <Input
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="Ask a question about this doc..."
                  disabled={asking}
                  className="bg-white text-xs rounded-full"
                />
                <Button
                  type="submit"
                  variant="default"
                  size="icon"
                  disabled={asking || !inputQuestion.trim()}
                  className="h-9 w-9 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
