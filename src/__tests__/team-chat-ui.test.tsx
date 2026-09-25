import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TeamChatSidebar } from "@/components/team-chat/team-chat-sidebar"
import { MessageComposer } from "@/components/team-chat/message-composer"
import { MessageBubble } from "@/components/team-chat/message-bubble"
import { TeamConversationItem, TeamMessageItem } from "@/lib/api/team-chat"

describe("Team Chat UI Components", () => {
  const mockConversations: TeamConversationItem[] = [
    {
      id: "ch-1",
      workspaceId: "ws-1",
      projectId: null,
      type: "CHANNEL",
      name: "product",
      description: "Product talk",
      isPrivate: false,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 3,
      members: [],
    },
    {
      id: "ch-2",
      workspaceId: "ws-1",
      projectId: null,
      type: "CHANNEL",
      name: "engineering",
      description: "Dev talk",
      isPrivate: false,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
      members: [],
    },
    {
      id: "dm-1",
      workspaceId: "ws-1",
      projectId: null,
      type: "DIRECT_MESSAGE",
      name: null,
      description: null,
      isPrivate: true,
      lastMessageAt: new Date().toISOString(),
      unreadCount: 1,
      members: [
        { id: "user-current", name: "Current User", email: "curr@test.com", image: null },
        { id: "user-jiya", name: "Jiya Sadaria", email: "jiya@test.com", image: null, companyRole: "BA", department: "Product" },
      ],
    },
  ]

  describe("TeamChatSidebar", () => {
    it("renders channels, direct messages and unread badges", () => {
      const onSelect = vi.fn()
      const onOpenChannel = vi.fn()
      const onOpenDM = vi.fn()

      render(
        <TeamChatSidebar
          workspaceName="Acme Corp Workspace"
          conversations={mockConversations}
          activeConversationId="ch-1"
          currentUserId="user-current"
          onSelectConversation={onSelect}
          onOpenCreateChannel={onOpenChannel}
          onOpenCreateDM={onOpenDM}
          unreadCounts={{ "ch-1": 3, "dm-1": 1 }}
        />
      )

      expect(screen.getByText("Acme Corp Workspace")).toBeDefined()
      expect(screen.getByText("product")).toBeDefined()
      expect(screen.getByText("engineering")).toBeDefined()
      expect(screen.getByText("Jiya Sadaria")).toBeDefined()

      // Unread badges
      expect(screen.getByText("3")).toBeDefined()
      expect(screen.getByText("1")).toBeDefined()

      // Switching conversations
      fireEvent.click(screen.getByText("engineering"))
      expect(onSelect).toHaveBeenCalledWith("ch-2")
    })

    it("filters conversations using search query", () => {
      render(
        <TeamChatSidebar
          workspaceName="Acme Corp Workspace"
          conversations={mockConversations}
          activeConversationId="ch-1"
          currentUserId="user-current"
          onSelectConversation={vi.fn()}
          onOpenCreateChannel={vi.fn()}
          onOpenCreateDM={vi.fn()}
          unreadCounts={{}}
        />
      )

      const searchInput = screen.getByPlaceholderText(/Jump to channel/i)
      fireEvent.change(searchInput, { target: { value: "eng" } })

      expect(screen.getByText("engineering")).toBeDefined()
      expect(screen.queryByText("product")).toBeNull()
    })
  })

  describe("MessageComposer", () => {
    it("preserves message text if send fails and shows retry option", async () => {
      let draftText = "Failed message test"
      const onDraftChange = vi.fn((t) => {
        draftText = t
      })
      const onSend = vi.fn().mockRejectedValue(new Error("Network connection dropped"))

      render(
        <MessageComposer
          conversationName="#product"
          draft={draftText}
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      )

      const sendBtn = screen.getByTitle("Send message")
      fireEvent.click(sendBtn)

      await waitFor(() => {
        expect(screen.getByText("Network connection dropped")).toBeDefined()
      })

      // Ensure draft was NOT cleared!
      expect(draftText).toBe("Failed message test")
      expect(screen.getByText("Retry")).toBeDefined()
    })

    it("submits message on Enter without shift key", async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const onDraftChange = vi.fn()

      render(
        <MessageComposer
          conversationName="#product"
          draft="Quick idea"
          onDraftChange={onDraftChange}
          onSend={onSend}
        />
      )

      const textarea = screen.getByPlaceholderText("Message #product...")
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

      await waitFor(() => {
        expect(onSend).toHaveBeenCalledWith("Quick idea")
      })
    })
  })

  describe("MessageBubble", () => {
    const mockMessage: TeamMessageItem = {
      id: "m-1",
      conversationId: "ch-1",
      senderId: "user-jiya",
      sender: {
        id: "user-jiya",
        name: "Jiya Sadaria",
        email: "jiya@test.com",
        image: null,
        companyRole: "Business Analyst",
      },
      content: "Let's review the new requirements document.",
      editedAt: null,
      createdAt: new Date().toISOString(),
      reactions: [{ id: "r-1", emoji: "👍", userId: "user-current", userName: "Current User" }],
    }

    it("renders sender info, message content, and reaction badge", () => {
      render(
        <MessageBubble
          message={mockMessage}
          currentUserId="user-current"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onToggleReaction={vi.fn()}
        />
      )

      expect(screen.getByText("Jiya Sadaria")).toBeDefined()
      expect(screen.getByText("Business Analyst")).toBeDefined()
      expect(screen.getByText("Let's review the new requirements document.")).toBeDefined()
      expect(screen.getAllByText("👍").length).toBeGreaterThan(0)
    })
  })
})
