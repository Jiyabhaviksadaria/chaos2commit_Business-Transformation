"use client"

import * as React from "react"
import {
  TeamConversationItem,
  TeamMessageItem,
  TeamWorkspaceInfo,
  getWorkspaceInfo,
  getConversations,
  createConversation,
  getMessages,
  sendTeamMessage,
  editTeamMessage,
  deleteTeamMessage,
  markConversationAsRead,
  toggleMessageReaction,
} from "@/lib/api/team-chat"
import { TeamChatSidebar } from "./team-chat-sidebar"
import { ConversationView } from "./conversation-view"
import { EmptyConversationState } from "./empty-conversation-state"
import { CreateChannelDialog } from "./create-channel-dialog"
import { CreateDMDialog } from "./create-dm-dialog"
import { CreateGroupDialog } from "./create-group-dialog"
import { Loader2 } from "lucide-react"

export function TeamChatShell() {
  const [workspaceInfo, setWorkspaceInfo] = React.useState<TeamWorkspaceInfo | null>(null)
  const [conversations, setConversations] = React.useState<TeamConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)

  // Multi-conversation state storage
  const [messagesByConv, setMessagesByConv] = React.useState<Record<string, TeamMessageItem[]>>({})
  const [loadingByConv, setLoadingByConv] = React.useState<Record<string, boolean>>({})
  const [hasMoreByConv, setHasMoreByConv] = React.useState<Record<string, boolean>>({})
  const [draftByConv, setDraftByConv] = React.useState<Record<string, string>>({})
  const [unreadCounts, setUnreadCounts] = React.useState<Record<string, number>>({})
  const [loadingOlderByConv, setLoadingOlderByConv] = React.useState<Record<string, boolean>>({})

  // UI state
  const [isLoadingInitial, setIsLoadingInitial] = React.useState(true)
  const [createChannelOpen, setCreateChannelOpen] = React.useState(false)
  const [createDMOpen, setCreateDMOpen] = React.useState(false)
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false)
  const [showMobileChat, setShowMobileChat] = React.useState(false)

  // 1. Initial Load: Workspace and Conversations
  React.useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        setIsLoadingInitial(true)
        const [wsData, convs] = await Promise.all([
          getWorkspaceInfo(),
          getConversations(),
        ])

        if (!isMounted) return
        setWorkspaceInfo(wsData)
        setConversations(convs)

        // Initialize unread counts map
        const initialUnread: Record<string, number> = {}
        convs.forEach((c) => {
          initialUnread[c.id] = c.unreadCount || 0
        })
        setUnreadCounts(initialUnread)

        // Default to #general or first conversation if available
        if (convs.length > 0) {
          const general = convs.find((c) => c.name === "general") || convs[0]
          setActiveConversationId(general.id)
        }
      } catch (err) {
        console.error("[TeamChatShell] Initial load failed:", err)
      } finally {
        if (isMounted) setIsLoadingInitial(false)
      }
    }

    initialize()
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Fetch messages for active conversation if not loaded
  React.useEffect(() => {
    if (!activeConversationId) return

    // If messages already cached for this conversation, don't refetch completely
    if (messagesByConv[activeConversationId] !== undefined) {
      // Mark read immediately upon view
      if ((unreadCounts[activeConversationId] || 0) > 0) {
        setUnreadCounts((prev) => ({ ...prev, [activeConversationId]: 0 }))
        markConversationAsRead(activeConversationId).catch(console.error)
      }
      return
    }

    let isMounted = true
    async function loadMessages() {
      try {
        setLoadingByConv((prev) => ({ ...prev, [activeConversationId!]: true }))
        const res = await getMessages(activeConversationId!)

        if (!isMounted) return
        setMessagesByConv((prev) => ({ ...prev, [activeConversationId!]: res.messages }))
        setHasMoreByConv((prev) => ({ ...prev, [activeConversationId!]: res.hasMore }))

        // Mark read
        setUnreadCounts((prev) => ({ ...prev, [activeConversationId!]: 0 }))
        markConversationAsRead(activeConversationId!).catch(console.error)
      } catch (err) {
        console.error("[TeamChatShell] Error loading messages:", err)
      } finally {
        if (isMounted) {
          setLoadingByConv((prev) => ({ ...prev, [activeConversationId!]: false }))
        }
      }
    }

    loadMessages()
    return () => {
      isMounted = false
    }
  }, [activeConversationId, messagesByConv, unreadCounts])

  // 3. Real-time Server-Sent Events (SSE) Stream
  React.useEffect(() => {
    if (!workspaceInfo?.workspace.id) return

    const eventSourceUrl = `/api/team-chat/events?workspaceId=${encodeURIComponent(
      workspaceInfo.workspace.id
    )}`

    const eventSource = new EventSource(eventSourceUrl)

    eventSource.addEventListener("message:new", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const message: TeamMessageItem = payload.message
        if (!message) return

        const convId = message.conversationId

        // Append to conversation messages if cached
        setMessagesByConv((prev) => {
          const currentList = prev[convId]
          if (!currentList) return prev
          if (currentList.some((m) => m.id === message.id)) return prev
          return { ...prev, [convId]: [...currentList, message] }
        })

        // Update conversation's last message in sidebar list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  lastMessageAt: message.createdAt,
                  lastMessage: {
                    id: message.id,
                    content: message.content,
                    createdAt: message.createdAt,
                    senderName: message.sender?.name || "Unknown",
                  },
                }
              : c
          )
        )

        // Handle read / unread state
        if (activeConversationId === convId) {
          // If viewing this conversation, mark read
          markConversationAsRead(convId).catch(console.error)
        } else {
          // Increment unread count for that conversation
          setUnreadCounts((prev) => ({
            ...prev,
            [convId]: (prev[convId] || 0) + 1,
          }))
        }
      } catch (err) {
        console.error("[TeamChatShell] Error parsing message:new event:", err)
      }
    })

    eventSource.addEventListener("message:edit", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const message: TeamMessageItem = payload.message
        if (!message) return

        setMessagesByConv((prev) => {
          const currentList = prev[message.conversationId]
          if (!currentList) return prev
          return {
            ...prev,
            [message.conversationId]: currentList.map((m) =>
              m.id === message.id ? message : m
            ),
          }
        })
      } catch (err) {
        console.error("[TeamChatShell] Error parsing message:edit event:", err)
      }
    })

    eventSource.addEventListener("message:delete", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const { messageId, conversationId } = payload
        if (!messageId || !conversationId) return

        setMessagesByConv((prev) => {
          const currentList = prev[conversationId]
          if (!currentList) return prev
          return {
            ...prev,
            [conversationId]: currentList.filter((m) => m.id !== messageId),
          }
        })
      } catch (err) {
        console.error("[TeamChatShell] Error parsing message:delete event:", err)
      }
    })

    eventSource.addEventListener("reaction:update", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const { messageId, conversationId, reactions } = payload
        if (!messageId || !conversationId) return

        setMessagesByConv((prev) => {
          const currentList = prev[conversationId]
          if (!currentList) return prev
          return {
            ...prev,
            [conversationId]: currentList.map((m) =>
              m.id === messageId ? { ...m, reactions } : m
            ),
          }
        })
      } catch (err) {
        console.error("[TeamChatShell] Error parsing reaction:update event:", err)
      }
    })

    eventSource.addEventListener("conversation:new", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const conversation: TeamConversationItem = payload.conversation
        if (!conversation) return

        setConversations((prev) => {
          if (prev.some((c) => c.id === conversation.id)) return prev
          return [conversation, ...prev]
        })
      } catch (err) {
        console.error("[TeamChatShell] Error parsing conversation:new event:", err)
      }
    })

    eventSource.addEventListener("conversation:read", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data)
        const { conversationId, userId } = payload
        if (userId === workspaceInfo.currentUser.id) {
          setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }))
        }
      } catch (err) {
        console.error("[TeamChatShell] Error parsing conversation:read event:", err)
      }
    })

    return () => {
      eventSource.close()
    }
  }, [workspaceInfo?.workspace.id, workspaceInfo?.currentUser.id, activeConversationId])

  // Select conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setShowMobileChat(true)
    // Clear unread in state
    setUnreadCounts((prev) => ({ ...prev, [id]: 0 }))
    markConversationAsRead(id).catch(console.error)
  }

  // Load older messages
  const handleLoadOlder = async () => {
    if (!activeConversationId) return
    const currentList = messagesByConv[activeConversationId] || []
    if (currentList.length === 0) return

    const oldest = currentList[0]

    try {
      setLoadingOlderByConv((prev) => ({ ...prev, [activeConversationId]: true }))
      const res = await getMessages(activeConversationId, { before: oldest.createdAt })

      setMessagesByConv((prev) => ({
        ...prev,
        [activeConversationId]: [...res.messages, ...(prev[activeConversationId] || [])],
      }))
      setHasMoreByConv((prev) => ({
        ...prev,
        [activeConversationId]: res.hasMore,
      }))
    } catch (err) {
      console.error("[TeamChatShell] Failed to load older messages:", err)
    } finally {
      setLoadingOlderByConv((prev) => ({ ...prev, [activeConversationId]: false }))
    }
  }

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return
    const msg = await sendTeamMessage(activeConversationId, content)

    // Optimistically update conversation state
    setMessagesByConv((prev) => {
      const currentList = prev[activeConversationId] || []
      if (currentList.some((m) => m.id === msg.id)) return prev
      return { ...prev, [activeConversationId]: [...currentList, msg] }
    })

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              lastMessageAt: msg.createdAt,
              lastMessage: {
                id: msg.id,
                content: msg.content,
                createdAt: msg.createdAt,
                senderName: msg.sender?.name || "You",
              },
            }
          : c
      )
    )
  }

  // Edit message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return
    const updated = await editTeamMessage(messageId, newContent)

    setMessagesByConv((prev) => {
      const currentList = prev[activeConversationId] || []
      return {
        ...prev,
        [activeConversationId]: currentList.map((m) =>
          m.id === messageId ? updated : m
        ),
      }
    })
  }

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversationId) return
    await deleteTeamMessage(messageId)

    setMessagesByConv((prev) => {
      const currentList = prev[activeConversationId] || []
      return {
        ...prev,
        [activeConversationId]: currentList.filter((m) => m.id !== messageId),
      }
    })
  }

  // Toggle reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return
    const updatedReactions = await toggleMessageReaction(messageId, emoji)

    setMessagesByConv((prev) => {
      const currentList = prev[activeConversationId] || []
      return {
        ...prev,
        [activeConversationId]: currentList.map((m) =>
          m.id === messageId ? { ...m, reactions: updatedReactions } : m
        ),
      }
    })
  }

  // Create Channel action
  const handleCreateChannelSubmit = async (data: {
    name: string
    description?: string
    isPrivate: boolean
    projectId?: string
  }) => {
    const created = await createConversation({
      type: "CHANNEL",
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate,
      projectId: data.projectId,
    })

    setConversations((prev) => [created, ...prev])
    handleSelectConversation(created.id)
  }

  // Create DM action
  const handleSelectDMMember = async (memberId: string) => {
    const created = await createConversation({
      type: "DIRECT_MESSAGE",
      recipientUserId: memberId,
    })

    setConversations((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [created, ...prev]
    })
    handleSelectConversation(created.id)
  }

  // Create Group action
  const handleCreateGroupSubmit = async (data: {
    name?: string
    memberUserIds: string[]
  }) => {
    const created = await createConversation({
      type: "GROUP",
      name: data.name,
      memberUserIds: data.memberUserIds,
    })

    setConversations((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [created, ...prev]
    })
    handleSelectConversation(created.id)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  if (isLoadingInitial) {
    return (
      <div
        data-chat-shell="true"
        className="h-[calc(100dvh-5.5rem)] w-full flex items-center justify-center bg-white rounded-3xl border border-[#E8E4DC] shadow-xs"
      >
        <div className="flex flex-col items-center gap-2 text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin text-[#18181C]" />
          <span className="text-xs font-semibold text-neutral-600">
            Connecting to Team Chat...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      data-chat-shell="true"
      className="h-[calc(100dvh-5.5rem)] w-full flex overflow-hidden bg-white rounded-3xl border border-[#E8E4DC] shadow-xs"
    >
      {/* Sidebar: conversation list */}
      <div
        className={`w-full lg:w-72 shrink-0 h-full ${
          showMobileChat ? "hidden lg:flex" : "flex"
        }`}
      >
        <TeamChatSidebar
          className="w-full"
          workspaceName={workspaceInfo?.workspace.name || "Main Workspace"}
          conversations={conversations}
          activeConversationId={activeConversationId}
          currentUserId={workspaceInfo?.currentUser.id || ""}
          onSelectConversation={handleSelectConversation}
          onOpenCreateChannel={() => setCreateChannelOpen(true)}
          onOpenCreateDM={() => setCreateDMOpen(true)}
          onOpenCreateGroup={() => setCreateGroupOpen(true)}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Main Conversation Area */}
      <div
        className={`flex-1 h-full min-w-0 ${
          !showMobileChat && activeConversationId ? "hidden lg:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <ConversationView
            conversation={activeConversation}
            currentUserId={workspaceInfo?.currentUser.id || ""}
            messages={messagesByConv[activeConversation.id] || []}
            isLoadingMessages={Boolean(loadingByConv[activeConversation.id])}
            hasMoreMessages={Boolean(hasMoreByConv[activeConversation.id])}
            isLoadingOlder={Boolean(loadingOlderByConv[activeConversation.id])}
            onLoadOlder={handleLoadOlder}
            draft={draftByConv[activeConversation.id] || ""}
            onDraftChange={(text) =>
              setDraftByConv((prev) => ({ ...prev, [activeConversation.id]: text }))
            }
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onToggleReaction={handleToggleReaction}
            onBackToSidebar={() => setShowMobileChat(false)}
          />
        ) : (
          <EmptyConversationState
            onOpenCreateChannel={() => setCreateChannelOpen(true)}
            onOpenCreateDM={() => setCreateDMOpen(true)}
            onOpenCreateGroup={() => setCreateGroupOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        projects={workspaceInfo?.projects || []}
        onSubmit={handleCreateChannelSubmit}
      />

      <CreateDMDialog
        open={createDMOpen}
        onOpenChange={setCreateDMOpen}
        members={workspaceInfo?.members || []}
        currentUserId={workspaceInfo?.currentUser.id || ""}
        onSelectMember={handleSelectDMMember}
      />

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        members={workspaceInfo?.members || []}
        currentUserId={workspaceInfo?.currentUser.id || ""}
        onSubmit={handleCreateGroupSubmit}
      />
    </div>
  )
}
