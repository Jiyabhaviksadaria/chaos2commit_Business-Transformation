"use client"

import type { RefObject } from "react"
import { Send, Sparkles, Square } from "lucide-react"

type ChatComposerProps = {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  disabled: boolean
  isSending: boolean
  inputRef?: RefObject<HTMLInputElement>
}

export function ChatComposer({ value, onChange, onSend, onStop, disabled, isSending, inputRef }: ChatComposerProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!isSending) onSend()
      }}
      className="border-t border-[#E5DFD4] bg-[#FAF8F2] px-4 py-4 sm:px-6"
    >
      <div className="flex items-center gap-2 rounded-full border border-[#E5DFD4] bg-white p-2 shadow-sm transition focus-within:ring-2 focus-within:ring-[#F472B6]/40">
        <div className="pl-3 text-[#F472B6]">
          <Sparkles className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={isSending ? "AI is generating a response..." : "Ask AI about your architecture, system specs, or deliverables..."}
          aria-label="Message the AI assistant"
          className="min-w-0 flex-1 bg-transparent px-2 text-xs text-neutral-800 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isSending ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#18181C] px-3 py-2 text-[10px] font-bold text-white transition hover:bg-neutral-800"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="shrink-0 rounded-full bg-[#18181C] p-2.5 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <p className="mt-2 px-2 text-[10px] text-neutral-400">Your conversation is saved to this chat automatically.</p>
    </form>
  )
}
