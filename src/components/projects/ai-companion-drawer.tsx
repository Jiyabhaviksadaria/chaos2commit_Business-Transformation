"use client"

import React, { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bot, Sparkles, Send, RefreshCw, User, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface AiCompanionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  activeTab?: string
}

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: string
}

export function AiCompanionDrawer({
  open,
  onOpenChange,
  projectId,
  projectName,
  activeTab = "overview",
}: AiCompanionDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I am your AI Companion for "${projectName}". Ask me anything about your business requirements, target architecture, OpenAPI specs, ERDs, or process bottlenecks.`,
      timestamp: "Just now",
    },
  ])
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const quickActions = [
    `Analyze ${activeTab} bottlenecks`,
    `Suggest next steps for ${projectName}`,
    "Generate OpenAPI Contract",
    "Draft Database Schema",
  ]

  const handleSend = (overrideText?: string) => {
    const text = overrideText || input
    if (!text.trim() || isThinking) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!overrideText) setInput("")
    setIsThinking(true)

    // Contextual response simulation reading active project & tab
    setTimeout(() => {
      let aiText = `[Context: Project ${projectId} | Tab: ${activeTab}]\n\n`

      if (text.toLowerCase().includes("bottleneck") || text.toLowerCase().includes("analyze")) {
        aiText += `**Contextual Analysis for ${projectName} (${activeTab}):**\n1. **Integration Latency**: Batch processing legacy feeds causes a 45-min inventory delay.\n2. **Manual Approvals**: High risk of compliance breach in high-value orders.\n3. **Recommended Action**: Implement an Event-Driven Webhook pipeline.`
      } else if (text.toLowerCase().includes("api") || text.toLowerCase().includes("openapi")) {
        aiText += `**Generated OpenAPI Spec Snippet:**\n\`\`\`yaml\n/v1/transformation/execute:\n  post:\n    summary: Execute transformation action\n    parameters:\n      - name: projectId\n        in: path\n        required: true\n\`\`\``
      } else {
        aiText += `Based on standard transformation frameworks: I have evaluated "${text}" against project "${projectName}". The optimal deliverable to generate next is in the **${activeTab.toUpperCase()}** tab.`
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, aiMsg])
      setIsThinking(false)
    }, 900)
  }

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#F7F4EB] border-l border-[#E5DFD4] p-0 flex flex-col justify-between">
        {/* Header */}
        <SheetHeader className="p-5 border-b border-[#E5DFD4] bg-[#FAF8F2] text-left">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#F472B6] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                Contextual AI Companion
                <Badge className="bg-[#18181C] text-white text-[10px] font-bold">
                  Gemini 1.5 Pro
                </Badge>
              </SheetTitle>
              <SheetDescription className="text-xs text-neutral-500">
                Bound to {projectName} • Active Section: <span className="font-bold text-neutral-800 uppercase">{activeTab}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Action Chips */}
        <div className="p-3 bg-white border-b border-[#E5DFD4] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-extrabold text-neutral-400 uppercase shrink-0">Quick:</span>
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleSend(action)}
              className="bg-[#FAF8F2] hover:bg-[#FEE895] border border-[#E5DFD4] text-neutral-800 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 max-h-[calc(100vh-220px)]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-[#F472B6] text-white flex items-center justify-center shrink-0 text-xs shadow-sm mt-1">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-[20px] p-3.5 text-xs leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-[#18181C] text-white font-medium rounded-tr-none"
                    : "bg-white border border-[#E5DFD4] text-neutral-800 rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-200/50 text-[10px] text-neutral-400">
                  <span>{msg.timestamp}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="hover:text-neutral-700 transition-colors flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-[#18181C] text-white flex items-center justify-center shrink-0 text-xs shadow-sm mt-1">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex items-center gap-2 text-xs text-neutral-600 bg-white border border-[#E5DFD4] rounded-xl p-3 w-fit">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#F472B6]" />
              <span>Contextual AI is analyzing project specs...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#FAF8F2] border-t border-[#E5DFD4]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-white border border-[#E5DFD4] rounded-full p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#F472B6]/50"
          >
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask AI about ${activeTab}...`}
              className="border-none shadow-none text-xs bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="bg-[#18181C] hover:bg-neutral-800 text-white h-8 w-8 rounded-full p-0 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
