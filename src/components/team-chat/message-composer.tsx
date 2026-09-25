"use client"

import * as React from "react"
import { Send, Loader2, AlertCircle } from "lucide-react"

interface MessageComposerProps {
  conversationName: string
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string) => Promise<void>
  disabled?: boolean
}

export function MessageComposer({
  conversationName,
  draft,
  onDraftChange,
  onSend,
  disabled = false,
}: MessageComposerProps) {
  const [isSending, setIsSending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending || disabled) return

    try {
      setIsSending(true)
      setErrorMessage(null)
      await onSend(trimmed)
      // Only clear if onSend resolved without error
      onDraftChange("")
      // Re-focus composer
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send message."
      setErrorMessage(msg)
      // Text is preserved in draft!
    } finally {
      setIsSending(false)
    }
  }

  // Auto-resize textarea height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [draft])

  return (
    <div className="p-3 bg-white border-t border-[#E8E4DC]">
      {errorMessage && (
        <div className="mb-2 p-2 px-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={handleSubmit}
            className="underline font-semibold hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      <div className="relative flex flex-col bg-[#FAF8F5] border border-[#E5E0D8] rounded-2xl focus-within:border-[#18181C] focus-within:ring-1 focus-within:ring-[#18181C] transition-all">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            onDraftChange(e.target.value)
            if (errorMessage) setErrorMessage(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${conversationName}...`}
          disabled={disabled || isSending}
          rows={1}
          className="w-full px-4 pt-3 pb-2 text-xs bg-transparent border-0 outline-none resize-none placeholder:text-neutral-400 text-neutral-900 min-h-[44px] max-h-[160px]"
        />

        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-[#E8E4DC]/60">
          <div className="text-[11px] text-neutral-400 select-none">
            <span className="font-semibold text-neutral-500">Return</span> to send,{" "}
            <span className="font-semibold text-neutral-500">Shift + Return</span> for new line
          </div>

          <button
            onClick={handleSubmit}
            disabled={!draft.trim() || isSending || disabled}
            title="Send message"
            className={`h-7 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all ${
              !draft.trim() || isSending || disabled
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-[#18181C] text-white hover:bg-black shadow-xs cursor-pointer"
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="h-3 w-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
