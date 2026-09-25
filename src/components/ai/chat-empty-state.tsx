"use client"

import { Bot, MessageCirclePlus, Sparkles } from "lucide-react"

type ChatEmptyStateProps = {
  hasActiveChat: boolean
  onNewChat: () => void
  onPrompt: (prompt: string) => void
  disabled?: boolean
}

const prompts = [
  "Draft System Architecture for POS Modernization",
  "Generate Data Flow Diagram for Inventory Sync",
  "Analyze CRM Lead Management Bottlenecks",
  "Create OpenAPI Spec for Order Processing API",
]

export function ChatEmptyState({ hasActiveChat, onNewChat, onPrompt, disabled = false }: ChatEmptyStateProps) {
  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10 text-center">
      <div className="max-w-md space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F472B6] text-white shadow-lg shadow-[#F472B6]/20">
          <Bot className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">
            {hasActiveChat ? "Start the conversation" : "Start a conversation"}
          </h2>
          <p className="text-xs leading-5 text-neutral-500">
            Ask questions, analyze business problems, or generate specifications for your enterprise projects.
          </p>
        </div>

        {!hasActiveChat && (
          <button
            type="button"
            onClick={onNewChat}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-full bg-[#18181C] px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageCirclePlus className="h-3.5 w-3.5 text-[#F8B4D9]" />
            Start a new chat
          </button>
        )}

        <div className="space-y-2 pt-2 text-left">
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            <Sparkles className="h-3 w-3 text-[#F472B6]" />
            Try a prompt
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {prompts.slice(0, 2).map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPrompt(prompt)}
                disabled={disabled}
                className="rounded-2xl border border-[#E5DFD4] bg-white px-3 py-2.5 text-left text-[11px] font-medium leading-4 text-neutral-700 transition hover:border-[#F8B4D9] hover:bg-[#FFF8FB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
