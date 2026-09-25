"use client"

import * as React from "react"
import {
  Hash,
  Lock,
  Users,
  ArrowLeft,
  Loader2,
  MessageSquare,
  FolderKanban,
  Briefcase,
} from "lucide-react"
import { TeamConversationItem, TeamMessageItem, TeamUser } from "@/lib/api/team-chat"
import { MessageBubble } from "./message-bubble"
import { MessageComposer } from "./message-composer"

interface ConversationViewProps {
  conversation: TeamConversationItem
  currentUserId: string
  messages: TeamMessageItem[]
  isLoadingMessages: boolean
  hasMoreMessages: boolean
  isLoadingOlder: boolean
  onLoadOlder: () => void
  draft: string
  onDraftChange: (text: string) => void
  onSendMessage: (text: string) => Promise<void>
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>
  onBackToSidebar?: () => void
}

export function ConversationView({
  conversation,
  currentUserId,
  messages,
  isLoadingMessages,
  hasMoreMessages,
  isLoadingOlder,
  onLoadOlder,
  draft,
  onDraftChange,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onBackToSidebar,
}: ConversationViewProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const isNearBottomRef = React.useRef(true)

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120
  }

  // Auto-scroll to bottom on new messages if user was already near bottom
  React.useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages.length])

  // Initial scroll to bottom on conversation change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
  }, [conversation.id])

  const otherMember: TeamUser | undefined =
    conversation.type === "DIRECT_MESSAGE"
      ? conversation.members.find((m) => m.id !== currentUserId)
      : undefined

  // Compute display title
  let displayName = conversation.name || "Conversation"
  if (conversation.type === "DIRECT_MESSAGE") {
    displayName = otherMember?.name || otherMember?.email || "Direct Message"
  } else if (conversation.type === "GROUP") {
    displayName = conversation.name || "Group Conversation"
  }

  // Compute subtitle
  let subtitle: React.ReactNode = ""
  if (conversation.type === "DIRECT_MESSAGE") {
    const role = otherMember?.companyRole
    const dept = otherMember?.department
    if (role && dept) {
      subtitle = (
        <span>
          <span className="font-medium text-neutral-700">{role}</span>
          <span className="text-neutral-400 mx-1.5">•</span>
          <span>{dept}</span>
        </span>
      )
    } else {
      subtitle = role || dept || otherMember?.email || "Teammate"
    }
  } else if (conversation.type === "GROUP") {
    const names = conversation.members
      .map((m) => m.name || m.email?.split("@")[0])
      .filter(Boolean)
      .join(", ")
    subtitle = names || `${conversation.members.length} members`
  } else {
    // Channel
    if (conversation.projectName) {
      subtitle = (
        <span className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-neutral-800">
            {conversation.projectName}
          </span>
          <span className="text-neutral-400">•</span>
          <span className="truncate">
            {conversation.description || "Transformation collaboration"}
          </span>
        </span>
      )
    } else {
      subtitle = conversation.description || `Welcome to #${conversation.name}`
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Conversation Top Header */}
      <div className="h-16 px-4 border-b border-[#E8E4DC] flex items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToSidebar && (
            <button
              onClick={onBackToSidebar}
              className="lg:hidden p-1.5 -ml-1 text-neutral-600 hover:text-black rounded-lg hover:bg-neutral-100"
              title="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            {conversation.type === "CHANNEL" ? (
              conversation.projectId || conversation.projectName ? (
                <div className="h-8 w-8 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0">
                  <FolderKanban className="h-4 w-4 text-amber-700" />
                </div>
              ) : conversation.isPrivate ? (
                <div className="h-8 w-8 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-neutral-600" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center shrink-0">
                  <Hash className="h-4 w-4 text-neutral-600" />
                </div>
              )
            ) : conversation.type === "GROUP" ? (
              <div className="h-8 w-8 rounded-xl bg-[#18181C] text-white flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#18181C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-[#18181C] truncate leading-tight">
                  {conversation.type === "CHANNEL" ? `#${displayName}` : displayName}
                </h1>
                {conversation.projectName && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                    <FolderKanban className="h-2.5 w-2.5 text-amber-700" />
                    Project
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-500 truncate leading-tight mt-0.5">
                {subtitle}
              </div>
            </div>
          </div>
        </div>

        {/* Header Right: Member context & tags */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 shrink-0">
          {conversation.type === "DIRECT_MESSAGE" && otherMember?.department && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[#FAF8F5] text-neutral-700 border border-[#E8E4DC]">
              <Briefcase className="h-3 w-3 text-neutral-400" />
              {otherMember.department}
            </span>
          )}

          <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E8E4DC] px-2.5 py-1 rounded-lg">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <span className="font-semibold text-neutral-700">
              {conversation.members.length || 1}{" "}
              <span className="hidden sm:inline font-normal text-neutral-500">
                {conversation.members.length === 1 ? "member" : "members"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 py-4 px-2 space-y-1"
      >
        {/* Load older messages button if available */}
        {hasMoreMessages && (
          <div className="flex justify-center pb-2">
            <button
              onClick={onLoadOlder}
              disabled={isLoadingOlder}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-[#FAF8F5] border border-[#E8E4DC] px-3 py-1 rounded-full hover:bg-neutral-100 transition-colors"
            >
              {isLoadingOlder ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading older messages...
                </>
              ) : (
                "Load older messages"
              )}
            </button>
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && !isLoadingMessages && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-sm mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-3">
              {conversation.type === "CHANNEL" ? (
                conversation.projectName ? (
                  <FolderKanban className="h-6 w-6 text-amber-600" />
                ) : (
                  <Hash className="h-6 w-6 text-neutral-400" />
                )
              ) : conversation.type === "GROUP" ? (
                <Users className="h-6 w-6 text-neutral-400" />
              ) : (
                <MessageSquare className="h-6 w-6 text-neutral-400" />
              )}
            </div>
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              {conversation.type === "CHANNEL"
                ? `Welcome to #${conversation.name}!`
                : conversation.type === "GROUP"
                ? `Welcome to ${displayName}`
                : `Conversation with ${displayName}`}
            </h2>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              {conversation.type === "CHANNEL"
                ? conversation.projectName
                  ? `This is the dedicated channel for the ${conversation.projectName} project. Collaborate on deliverables, scope, and analysis here.`
                  : conversation.description || "This is the start of the channel. Send a message to get things rolling."
                : conversation.type === "GROUP"
                ? "This is the start of this group conversation. Send a message to collaborate together."
                : "This is the very beginning of your direct message history. Say hello!"}
            </p>
          </div>
        )}

        {/* Loading Spinner for Messages */}
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center py-20 text-neutral-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-medium">Loading conversation...</span>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onToggleReaction={onToggleReaction}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        conversationName={conversation.type === "CHANNEL" ? `#${displayName}` : displayName}
        draft={draft}
        onDraftChange={onDraftChange}
        onSend={onSendMessage}
      />
    </div>
  )
}
