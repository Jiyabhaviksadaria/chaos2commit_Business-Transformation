"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Send, Bot, Sparkles, User, ArrowLeft, RefreshCw, Copy, Check } from "lucide-react"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: string
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I am your Business Transformation AI Assistant. How can I help you analyze, design, or generate specifications for your enterprise projects today?",
      timestamp: "Just now"
    }
  ])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const quickPrompts = [
    "Draft System Architecture for POS Modernization",
    "Generate Data Flow Diagram for Inventory Sync",
    "Analyze CRM Lead Management Bottlenecks",
    "Create OpenAPI Spec for Order Processing API"
  ]

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim() || isGenerating) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInput("")
    setIsGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      let aiText = "I have analyzed your request against standard enterprise architecture frameworks. "

      if (query.toLowerCase().includes("pos") || query.toLowerCase().includes("inventory")) {
        aiText += "Here is a high-level recommendation:\n\n1. **Event-Driven Architecture**: Use Webhooks + Kafka topic for real-time inventory updates.\n2. **Offline Mode Capability**: Implement local SQLite storage at POS terminals with background retry sync.\n3. **API Contracts**: Expose `/v1/inventory/deduct` and `/v1/transactions/sync` microservices."
      } else if (query.toLowerCase().includes("crm") || query.toLowerCase().includes("lead")) {
        aiText += "Here are the optimization steps for Lead Management:\n\n- **Automated Lead Scoring**: Trigger scoring engine upon web intake.\n- **SLA Escalation**: Auto-assign uncontacted leads within 15 minutes.\n- **Data Privacy**: Ensure GDPR/CCPA consent flags are audited in CRM records."
      } else {
        aiText += `Based on your transformation goals: "${query}", I recommend structuring this module into 3 deliverables:\n- **PRD Specification**\n- **Domain ERD Model**\n- **API Integration Contracts**.\n\nYou can generate full specification documents directly inside your active project workspace!`
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, aiMsg])
      setIsGenerating(false)
    }, 900)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">AI Assistant</h1>
              <span className="bg-[#F8B4D9] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Copilot 3.5
              </span>
            </div>
            <p className="text-xs text-neutral-500">Ask questions, generate specs, or brainstorm architecture solutions.</p>
          </div>
        </div>

        <Link href="/projects">
          <button className="flex items-center gap-2 bg-[#18181C] text-white text-xs font-bold px-4 py-2 rounded-full shadow hover:bg-neutral-800 transition-all">
            <span>Return to Projects Dashboard</span>
          </button>
        </Link>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-neutral-400 shrink-0">Prompts:</span>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="bg-[#FAF8F2] hover:bg-[#FEE895] border border-[#E5DFD4] text-neutral-800 text-xs font-medium px-3.5 py-1.5 rounded-full shrink-0 transition-colors shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[28px] p-6 min-h-[450px] flex flex-col justify-between shadow-sm">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-9 w-9 rounded-full bg-[#F472B6] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-xl rounded-[22px] p-4 text-xs leading-relaxed relative group shadow-sm ${
                  msg.role === "user"
                    ? "bg-[#18181C] text-white font-medium rounded-tr-none"
                    : "bg-white border border-[#E5DFD4] text-neutral-800 rounded-tl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200/50 text-[10px] text-neutral-400">
                  <span>{msg.timestamp}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className="hover:text-neutral-700 transition-colors flex items-center gap-1"
                    >
                      {copiedId === msg.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="h-9 w-9 rounded-full bg-[#18181C] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-3 items-center text-xs text-neutral-500 italic bg-white border border-[#E5DFD4] rounded-2xl p-3 w-fit">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#F472B6]" />
              <span>AI is thinking & analyzing parameters...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="mt-6 pt-4 border-t border-[#E5DFD4]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 bg-white border border-[#E5DFD4] rounded-full p-2 shadow-sm focus-within:ring-2 focus-within:ring-[#F472B6]/50 transition-all"
          >
            <div className="pl-3 text-[#F472B6]">
              <Sparkles className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI assistant about your architecture, system specs, or deliverables..."
              className="flex-1 bg-transparent text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none px-2"
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="bg-[#18181C] hover:bg-neutral-800 disabled:opacity-50 text-white p-2.5 rounded-full transition-all shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
