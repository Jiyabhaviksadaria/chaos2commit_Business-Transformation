"use client"

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react"
import { Send, Sparkles, Square } from "lucide-react"

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  disabled: boolean
  isSending: boolean
  inputRef?: RefObject<HTMLTextAreaElement | HTMLInputElement>
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  isSending,
  inputRef,
}: ChatComposerProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textarea height between 36px (compact) and 136px (~5-6 lines)
  useEffect(() => {
    const textarea = internalRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 36), 136)
    textarea.style.height = `${nextHeight}px`
  }, [value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!disabled && !isSending && value.trim()) {
        onSend()
      }
    }
  }

  const setCombinedRef = (element: HTMLTextAreaElement | null) => {
    internalRef.current = element
    if (typeof inputRef === "function") {
      (inputRef as (instance: HTMLTextAreaElement | null) => void)(element)
    } else if (inputRef && "current" in inputRef) {
      (inputRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = element
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSending && !disabled && value.trim()) onSend()
      }}
      className="border-t border-[#E5DFD4] bg-[#FAF8F2] px-4 py-3 sm:px-6"
    >
      <div className="flex items-end gap-2 rounded-[24px] border border-[#E5DFD4] bg-white p-2 shadow-sm transition-all duration-200 focus-within:border-[#F472B6] focus-within:ring-2 focus-within:ring-[#F472B6]/30">
        <div className="pb-2 pl-2.5 text-[#F472B6] shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <textarea
          ref={setCombinedRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            isSending
              ? "AI is generating a response..."
              : "Ask AI about your architecture, system specs, or deliverables... (Enter to send, Shift+Enter for new line)"
          }
          aria-label="Message the AI assistant"
          className="min-h-[36px] max-h-[136px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-xs leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 custom-chat-scrollbar"
        />
        {isSending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#18181C] px-3.5 py-2 text-[10px] font-bold text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <Square className="h-3 w-3 fill-current text-[#F8B4D9]" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#18181C] p-2.5 text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
          >
            <Send className="h-3.5 w-3.5 text-[#F8B4D9]" />
          </button>
        )}
      </div>
      <p className="mt-1.5 px-2 text-[10px] text-neutral-400">
        Your conversation is saved to this chat automatically · Use Shift + Enter for multiline
      </p>
    </form>
  )
}
