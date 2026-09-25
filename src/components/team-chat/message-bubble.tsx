"use client"

import * as React from "react"
import { TeamMessageItem } from "@/lib/api/team-chat"
import { Smile, Edit2, Trash2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  message: TeamMessageItem
  currentUserId: string
  onEdit: (messageId: string, newContent: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>
}

const QUICK_EMOJIS = ["👍", "❤️", "🚀", "🎉", "👀"]

function formatMessageTime(isoString: string) {
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  } catch {
    return ""
  }
}

export function MessageBubble({
  message,
  currentUserId,
  onEdit,
  onDelete,
  onToggleReaction,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editContent, setEditContent] = React.useState(message.content)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)

  const isAuthor = message.senderId === currentUserId

  const senderName = message.sender?.name || message.sender?.email || "Unknown"
  const senderRole = message.sender?.companyRole || message.sender?.department
  const initials = senderName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false)
      return
    }

    try {
      setIsSaving(true)
      await onEdit(message.id, editContent.trim())
      setIsEditing(false)
    } catch {
      // Error handled by caller
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  // Group reactions by emoji
  const groupedReactions = React.useMemo(() => {
    const map = new Map<string, { count: number; userIds: string[]; hasReacted: boolean }>()
    message.reactions.forEach((r) => {
      const entry = map.get(r.emoji) || { count: 0, userIds: [], hasReacted: false }
      entry.count += 1
      entry.userIds.push(r.userId)
      if (r.userId === currentUserId) {
        entry.hasReacted = true
      }
      map.set(r.emoji, entry)
    })
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }))
  }, [message.reactions, currentUserId])

  return (
    <div className="group relative flex gap-3 px-4 py-2 hover:bg-[#F9F7F2]/80 transition-colors rounded-xl">
      {/* Sender Avatar */}
      <div className="h-8 w-8 rounded-full bg-[#18181C] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {initials}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-neutral-900">{senderName}</span>
          {senderRole && (
            <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded font-medium">
              {senderRole}
            </span>
          )}
          <span className="text-[10px] text-neutral-400">
            {formatMessageTime(message.createdAt)}
          </span>
          {message.editedAt && (
            <span className="text-[10px] text-neutral-400 italic">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2 mt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-[#18181C] bg-white focus:outline-none focus:ring-1 focus:ring-[#18181C] resize-none"
              rows={3}
              autoFocus
              disabled={isSaving}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editContent.trim()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#18181C] text-white px-2.5 py-1 rounded-lg hover:bg-black transition-colors"
              >
                <Check className="h-3 w-3" /> Save
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Reaction Badges */}
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {groupedReactions.map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(message.id, emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all border",
                  hasReacted
                    ? "bg-[#18181C] text-white border-[#18181C]"
                    : "bg-white text-neutral-700 border-[#E5E0D8] hover:bg-neutral-50"
                )}
              >
                <span>{emoji}</span>
                <span className="font-semibold text-[10px]">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Bar on Hover */}
      {!isEditing && (
        <div className="absolute right-4 top-2 hidden group-hover:flex items-center bg-white border border-[#E5E0D8] shadow-sm rounded-lg p-0.5 gap-0.5 z-10">
          {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggleReaction(message.id, emoji)}
              title={`React with ${emoji}`}
              className="h-6 w-6 rounded hover:bg-neutral-100 flex items-center justify-center text-xs"
            >
              {emoji}
            </button>
          ))}

          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="More reactions"
              className="h-6 w-6 rounded hover:bg-neutral-100 flex items-center justify-center text-neutral-500"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute right-0 top-7 bg-white border border-[#E5E0D8] shadow-lg rounded-xl p-1.5 flex gap-1 z-20">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(message.id, emoji)
                      setShowEmojiPicker(false)
                    }}
                    className="h-7 w-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isAuthor && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="h-6 w-6 rounded hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                title="Delete message"
                className="h-6 w-6 rounded hover:bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
