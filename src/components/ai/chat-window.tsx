"use client"

import type { RefObject } from "react"
import { Bot, Menu, Sparkles } from "lucide-react"
import type { ChatMessage, ChatSummary } from "@/lib/api/ai-chats"
import { ChatComposer } from "@/components/ai/chat-composer"
import { ChatEmptyState } from "@/components/ai/chat-empty-state"
import { ChatMessageList } from "@/components/ai/chat-message-list"

const quickPrompts = [
  "Draft System Architecture for POS Modernization",
  "Generate Data Flow Diagram for Inventory Sync",
  "Analyze CRM Lead Management Bottlenecks",
  "Create OpenAPI Spec for Order Processing API",
]

type GenerationStatus = "starting" | "streaming" | "completed" | "cancelled" | "error"

type ChatWindowProps = {
  activeChat: ChatSummary | null
  messages: ChatMessage[]
  input: string
  loading: boolean
  sending: boolean
  generationStatus?: GenerationStatus
  streamingText?: string
  error: string | null
  inputRef?: RefObject<HTMLTextAreaElement | HTMLInputElement>
  onInputChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  onNewChat: () => void
  onPrompt: (prompt: string) => void
  onRetry: () => void
  onOpenSidebar: () => void
}

export function ChatWindow({
  activeChat,
  messages,
  input,
  loading,
  sending,
  generationStatus,
  streamingText,
  error,
  inputRef,
  onInputChange,
  onSend,
  onStop,
  onNewChat,
  onPrompt,
  onRetry,
  onOpenSidebar,
}: ChatWindowProps) {
  const generating = sending || generationStatus === "starting" || generationStatus === "streaming"
  const showEmptyState = !activeChat || (!loading && messages.length === 0 && !error && !generating)
  const composerDisabled = !activeChat || generating

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-[#E5DFD4] bg-[#FAF8F2] shadow-sm" aria-label="Current AI conversation">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E5DFD4] bg-white/50 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open chat history"
            className="rounded-full p-2 text-neutral-600 transition hover:bg-[#FCEAF3] hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F472B6] text-white shadow-sm">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-extrabold text-neutral-900">{activeChat?.title ?? "New conversation"}</h2>
              {activeChat && <span className="shrink-0 rounded-full bg-[#F8B4D9] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-neutral-900">Consultant</span>}
            </div>
            <p className="truncate text-[10px] text-neutral-400">Persistent conversation · saved automatically</p>
          </div>
        </div>
        {activeChat && (
          <div className="hidden items-center gap-1.5 text-[10px] font-bold text-neutral-400 sm:flex">
            <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
            Intelly Copilot 3.5
          </div>
        )}
      </header>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden flex flex-col">
        {showEmptyState ? (
          <ChatEmptyState hasActiveChat={Boolean(activeChat)} onNewChat={onNewChat} onPrompt={onPrompt} disabled={generating} />
        ) : (
          <ChatMessageList
            activeChatId={activeChat?.id}
            messages={messages}
            loading={loading}
            sending={generating}
            streamingText={streamingText}
            generationStatus={generationStatus}
            error={error}
            onRetry={onRetry}
          />
        )}
      </div>

      {activeChat ? (
        <div className="shrink-0">
          <ChatComposer
            value={input}
            onChange={onInputChange}
            onSend={onSend}
            onStop={onStop}
            disabled={composerDisabled}
            isSending={generating}
            inputRef={inputRef}
          />
        </div>
      ) : (
        <div className="shrink-0 border-t border-[#E5DFD4] bg-[#FAF8F2] px-4 py-4 text-center text-[10px] text-neutral-400 sm:px-6">Start a new chat to begin messaging.</div>
      )}
    </section>
  )
}

export { quickPrompts }
