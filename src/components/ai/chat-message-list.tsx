"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowDown, Bot, Check, Copy, RefreshCw, User } from "lucide-react"
import type { ChatMessage } from "@/lib/api/ai-chats"
import { AssistantMarkdown } from "@/components/ai/assistant-markdown"

type GenerationStatus = "starting" | "streaming" | "completed" | "cancelled" | "error"

function formatMessageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

type ChatMessageListProps = {
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  streamingText?: string
  generationStatus?: GenerationStatus
  error: string | null
  onRetry: () => void
  activeChatId?: string | null
}

export function ChatMessageList({
  messages,
  loading,
  sending,
  streamingText,
  generationStatus,
  error,
  onRetry,
  activeChatId,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const scrollPositionsRef = useRef<Record<string, number>>({})
  const prevChatIdRef = useRef<string | null>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const hasStreamingMessage = messages.some((message) => message.id.startsWith("stream-"))

  // Preserve & restore scroll position per chat
  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    if (activeChatId && activeChatId !== prevChatIdRef.current) {
      const savedPosition = scrollPositionsRef.current[activeChatId]
      if (typeof savedPosition === "number") {
        element.scrollTop = savedPosition
        const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
        shouldAutoScrollRef.current = distanceFromBottom < 100
        setShowScrollBottom(distanceFromBottom > 160)
      } else {
        element.scrollTop = element.scrollHeight
        shouldAutoScrollRef.current = true
        setShowScrollBottom(false)
      }
      prevChatIdRef.current = activeChatId
    }
  }, [activeChatId])

  // Smart auto-scroll: only follow new chunks/messages if user is already near bottom
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      const bottom = bottomRef.current
      if (bottom && typeof bottom.scrollIntoView === "function") {
        bottom.scrollIntoView({ behavior: "smooth", block: "end" })
      }
    }
  }, [messages.length, sending, streamingText, generationStatus])

  const handleScroll = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const isNear = distanceFromBottom < 100
    shouldAutoScrollRef.current = isNear
    setShowScrollBottom(distanceFromBottom > 160)

    if (activeChatId) {
      scrollPositionsRef.current[activeChatId] = element.scrollTop
    }
  }, [activeChatId])

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
      shouldAutoScrollRef.current = true
      setShowScrollBottom(false)
    }
  }, [])

  async function copyMessage(message: ChatMessage) {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId(null), 1800)
    } catch {
      setCopiedId(null)
    }
  }

  if (loading && messages.length === 0) {
    return (
      <div className="space-y-5 px-5 py-8 sm:px-8" aria-label="Loading conversation">
        {[0, 1, 2].map((item) => (
          <div key={item} className={`flex gap-3 ${item % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className={`h-8 w-8 shrink-0 rounded-full ${item % 2 === 0 ? "bg-[#F8B4D9]" : "bg-[#18181C]"}`} />
            <div className={`h-20 max-w-xl animate-pulse rounded-[22px] bg-white/80 ${item % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 custom-chat-scrollbar"
        aria-live="polite"
      >
        {messages.length === 0 && !loading && !error && !sending ? (
          <div className="flex h-full min-h-32 items-center justify-center text-xs text-neutral-400">No messages yet.</div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) => {
              const isUser = message.role === "user"
              const isSystem = message.role === "system"
              const isStreamingMessage = message.id.startsWith("stream-")
              return (
                <div key={message.id} className={`flex gap-3 animate-message-in ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && !isSystem && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F472B6] text-white shadow-sm">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative min-w-0 ${
                      isUser
                        ? "max-w-xl rounded-[22px] rounded-tr-none bg-[#18181C] px-4 py-3 text-xs font-medium leading-relaxed text-white shadow-sm"
                        : isSystem
                          ? "mx-auto max-w-xl rounded-[22px] border border-[#E5DFD4] bg-white/70 px-4 py-3 text-center text-[10px] text-neutral-500 shadow-sm"
                          : "max-w-2xl sm:max-w-3xl lg:max-w-4xl w-full rounded-[22px] rounded-tl-none border border-[#E5DFD4] bg-white px-4 py-3 text-xs leading-relaxed text-neutral-800 shadow-sm"
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : isSystem ? (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    ) : (
                      <AssistantMarkdown content={message.content} preserveTrailingWhitespace={isStreamingMessage} />
                    )}
                    <div className={`mt-2 flex items-center justify-between gap-3 border-t pt-2 text-[10px] ${isUser ? "border-white/10 text-white/50" : "border-[#EDE8DC] text-neutral-400"}`}>
                      <span suppressHydrationWarning>{isStreamingMessage ? "Generating" : formatMessageTime(message.createdAt)}</span>
                      {!isUser && !isSystem && !isStreamingMessage && (
                        <button
                          type="button"
                          onClick={() => void copyMessage(message)}
                          className="flex items-center gap-1 text-neutral-400 transition hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F472B6] rounded px-1"
                          aria-label={`Copy message from ${formatMessageTime(message.createdAt) || "AI"}`}
                        >
                          {copiedId === message.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedId === message.id ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#18181C] text-white shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })}

            {sending && !hasStreamingMessage && (
              <div className="flex gap-3 justify-start animate-message-in">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F472B6] text-white shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-3 rounded-[22px] rounded-tl-none border border-[#E5DFD4] bg-white px-4 py-3 text-xs text-neutral-600 shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#F472B6]" />
                  <span>AI is thinking &amp; analyzing parameters...</span>
                </div>
              </div>
            )}

            {generationStatus === "cancelled" && !error && (
              <div className="flex flex-col gap-3 rounded-2xl border border-[#E5DFD4] bg-white p-4 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between animate-message-in">
                <span>Generation stopped. You can retry this request.</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#18181C] px-3.5 py-1.5 font-bold text-white shadow-sm transition hover:bg-neutral-800 active:scale-95"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            {error && (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 sm:flex-row sm:items-center sm:justify-between animate-message-in">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-bold shadow-sm transition hover:bg-red-100 active:scale-95"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showScrollBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-3 right-6 z-10 flex items-center gap-1.5 rounded-full border border-[#E5DFD4] bg-white/95 px-3 py-1.5 text-[11px] font-bold text-neutral-700 shadow-md backdrop-blur-sm transition-all hover:bg-neutral-100 hover:text-neutral-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
        >
          <ArrowDown className="h-3.5 w-3.5 text-[#F472B6]" />
          <span>Latest</span>
        </button>
      )}
    </div>
  )
}
