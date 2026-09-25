"use client"

import * as React from "react"
import { MessageSquare, Hash, Users, UserPlus } from "lucide-react"

interface EmptyConversationStateProps {
  onOpenCreateChannel: () => void
  onOpenCreateDM: () => void
  onOpenCreateGroup?: () => void
}

export function EmptyConversationState({
  onOpenCreateChannel,
  onOpenCreateDM,
  onOpenCreateGroup,
}: EmptyConversationStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
      <div className="max-w-md space-y-5">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center shadow-xs">
          <MessageSquare className="h-8 w-8 text-[#18181C]" />
        </div>

        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#18181C]">
            Select a conversation
          </h2>
          <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
            Choose a department or project channel from the sidebar, start a direct message, or collaborate in a team group in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            onClick={onOpenCreateChannel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#18181C] text-white hover:bg-black transition-colors shadow-xs"
          >
            <Hash className="h-3.5 w-3.5" />
            Create Channel
          </button>
          <button
            onClick={onOpenCreateDM}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FAF8F5] text-neutral-800 border border-[#E8E4DC] hover:bg-neutral-100 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Direct Message
          </button>
          {onOpenCreateGroup && (
            <button
              onClick={onOpenCreateGroup}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FAF8F5] text-neutral-800 border border-[#E8E4DC] hover:bg-neutral-100 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              New Group
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
