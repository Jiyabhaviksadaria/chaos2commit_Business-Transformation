"use client"

import { MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ChatSummary } from "@/lib/api/ai-chats"

export type ChatDateGroup = {
  label: string
  chats: ChatSummary[]
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function groupChatsByDate(chats: ChatSummary[], now = new Date()): ChatDateGroup[] {
  const today = startOfDay(now)
  const yesterday = today - 24 * 60 * 60 * 1000
  const groups = new Map<string, ChatSummary[]>()

  for (const chat of chats) {
    const timestamp = new Date(chat.updatedAt).getTime()
    const day = Number.isNaN(timestamp) ? Number.NaN : startOfDay(new Date(timestamp))
    const label = day === today ? "TODAY" : day === yesterday ? "YESTERDAY" : "EARLIER"
    const group = groups.get(label) ?? []
    group.push(chat)
    groups.set(label, group)
  }

  const order = ["TODAY", "YESTERDAY", "EARLIER"]
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, chats: groups.get(label) ?? [] }))
}

function formatChatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const elapsed = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(elapsed / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)
}

type ChatSidebarProps = {
  chats: ChatSummary[]
  activeChatId: string | null
  loading: boolean
  error: string | null
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  onRenameChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onRetry: () => void
  generatingChatIds?: string[]
  newChatDisabled?: boolean
  className?: string
}

export function ChatSidebar({
  chats,
  activeChatId,
  loading,
  error,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onRetry,
  generatingChatIds = [],
  newChatDisabled = false,
  className,
}: ChatSidebarProps) {
  const groups = groupChatsByDate(chats)
  const generatingIds = new Set(generatingChatIds)

  return (
    <aside className={cn("flex h-full min-h-0 w-full flex-col rounded-[26px] border border-[#E5DFD4] bg-[#FAF8F2] p-3 shadow-sm overflow-hidden", className)} aria-label="AI chat history">
      <button
        type="button"
        onClick={onNewChat}
        disabled={newChatDisabled}
        className="flex shrink-0 w-full items-center justify-center gap-2 rounded-2xl bg-[#18181C] px-3 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4 text-[#F8B4D9]" />
        New Chat
      </button>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1.5 custom-chat-scrollbar">
        {loading && chats.length === 0 ? (
          <div className="space-y-2" aria-label="Loading chats">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-2xl bg-white/80" />
            ))}
          </div>
        ) : error && chats.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <p>{error}</p>
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-bold">
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          </div>
        ) : chats.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs leading-5 text-neutral-400">No conversations yet.</div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">
                <span>{error}</span>
                <button type="button" onClick={onRetry} className="shrink-0 font-bold">
                  Retry
                </button>
              </div>
            )}
            {groups.map((group) => (
              <section key={group.label} aria-label={group.label.toLowerCase()}>
                <h2 className="px-2 text-[10px] font-extrabold tracking-[0.18em] text-neutral-400">
                  {group.label}
                </h2>
                <div className="mt-2 space-y-1">
                  {group.chats.map((chat) => {
                    const isActive = chat.id === activeChatId
                    const isGenerating = generatingIds.has(chat.id)
                    return (
                      <div key={chat.id} className={cn("group flex items-center rounded-2xl transition-colors", isActive ? "bg-white shadow-sm ring-1 ring-[#F8B4D9]" : "hover:bg-white/70")}>
                        <button
                          type="button"
                          onClick={() => onSelectChat(chat.id)}
                          aria-current={isActive ? "page" : undefined}
                          className="min-w-0 flex-1 rounded-2xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
                        >
                          <span className={cn("block truncate text-xs font-bold", isActive ? "text-neutral-900" : "text-neutral-700")}>{chat.title}</span>
                          <span suppressHydrationWarning className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-400">
                            {isGenerating && (
                              <span aria-label={`${chat.title} generating`} className="inline-flex items-center gap-1 text-[#F472B6]">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F472B6]" />
                                Generating...
                              </span>
                            )}
                            {!isGenerating && formatChatTime(chat.updatedAt)}
                          </span>
                        </button>
                        <div className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for ${chat.title}`}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-[#FCEAF3] hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => onRenameChat(chat.id)}>
                                <Pencil className="h-3.5 w-3.5" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onDeleteChat(chat.id)} className="text-red-600 focus:text-red-700">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
