import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformRole, OrgRole, TeamConversationType, TeamMemberRole } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  resolveUserWorkspace: vi.fn(),
  requireConversationAccess: vi.fn(),
  markConversationRead: vi.fn(),
  broadcastTeamChatEvent: vi.fn(),
  db: {
    membership: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    teamConversation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teamConversationMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    teamMessage: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    teamMessageReaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/access", () => ({
  requireUser: mocks.requireUser,
  AccessError: class AccessError extends Error {
    constructor(msg: string) {
      super(msg)
      this.name = "AccessError"
    }
  },
}))

vi.mock("@/lib/team-chat/access", () => ({
  resolveUserWorkspace: mocks.resolveUserWorkspace,
  requireConversationAccess: mocks.requireConversationAccess,
  markConversationRead: mocks.markConversationRead,
}))

vi.mock("@/lib/team-chat/events", () => ({
  broadcastTeamChatEvent: mocks.broadcastTeamChatEvent,
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}))

import { GET as getWorkspace } from "@/app/api/team-chat/workspace/route"
import { GET as getConversations, POST as createConversation } from "@/app/api/team-chat/conversations/route"
import { GET as getMessages, POST as sendMessage } from "@/app/api/team-chat/conversations/[conversationId]/messages/route"
import { PATCH as editMessage, DELETE as deleteMessage } from "@/app/api/team-chat/messages/[messageId]/route"
import { POST as markRead } from "@/app/api/team-chat/conversations/[conversationId]/read/route"
import { POST as toggleReaction } from "@/app/api/team-chat/messages/[messageId]/reactions/route"

describe("Team Chat API Suite", () => {
  const mockUserA = {
    id: "user-a",
    email: "user-a@intelly.local",
    name: "User A",
    companyRole: "Product Manager",
    department: "Product",
    role: PlatformRole.USER,
  }

  const mockUserB = {
    id: "user-b",
    email: "user-b@intelly.local",
    name: "User B",
    companyRole: "Software Engineer",
    department: "Engineering",
    role: PlatformRole.USER,
  }

  const mockWorkspace = {
    id: "ws-1",
    name: "Main Workspace",
    description: "Default workspace",
    organizationId: "org-1",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue(mockUserA)
    mocks.resolveUserWorkspace.mockResolvedValue({
      workspace: mockWorkspace,
      user: mockUserA,
      orgRole: OrgRole.ADMIN,
    })
  })

  describe("GET /api/team-chat/workspace", () => {
    it("returns workspace details, current user, members list, and projects", async () => {
      mocks.db.membership.findMany.mockResolvedValue([
        { user: mockUserA, role: OrgRole.ADMIN },
        { user: mockUserB, role: OrgRole.EDITOR },
      ])
      mocks.db.project.findMany.mockResolvedValue([
        { id: "proj-1", name: "UrbanNest Home", industry: "Retail", businessGoal: "Omnichannel transformation" },
      ])

      const req = new Request("http://localhost:3000/api/team-chat/workspace")
      const res = await getWorkspace(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.workspace.id).toBe("ws-1")
      expect(data.currentUser.id).toBe("user-a")
      expect(data.members).toHaveLength(2)
      expect(data.members[1].name).toBe("User B")
      expect(data.projects).toHaveLength(1)
      expect(data.projects[0].name).toBe("UrbanNest Home")
    })
  })

  describe("GET /api/team-chat/conversations", () => {
    it("lists channels and computes unread count accurately", async () => {
      const mockConv = {
        id: "conv-1",
        workspaceId: "ws-1",
        projectId: null,
        type: TeamConversationType.CHANNEL,
        name: "product",
        description: "Product discussions",
        isPrivate: false,
        lastMessageAt: new Date(),
        members: [{ userId: "user-a", lastReadAt: new Date(Date.now() - 60000), user: mockUserA, role: TeamMemberRole.MEMBER }],
        messages: [{ id: "m-1", content: "Hello team", createdAt: new Date(), sender: { id: "user-b", name: "User B" } }],
      }

      mocks.db.teamConversation.findMany.mockResolvedValue([mockConv])
      mocks.db.teamMessage.count.mockResolvedValue(3)

      const req = new Request("http://localhost:3000/api/team-chat/conversations")
      const res = await getConversations(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.conversations).toHaveLength(1)
      expect(data.conversations[0].name).toBe("product")
      expect(data.conversations[0].unreadCount).toBe(3)
      expect(data.conversations[0].lastMessage?.content).toBe("Hello team")
    })
  })

  describe("POST /api/team-chat/conversations", () => {
    it("creates a new public channel", async () => {
      mocks.db.teamConversation.findFirst.mockResolvedValue(null)
      mocks.db.teamConversation.create.mockResolvedValue({
        id: "conv-new",
        workspaceId: "ws-1",
        type: TeamConversationType.CHANNEL,
        name: "launch-strategy",
        description: "Launch planning",
        isPrivate: false,
        members: [],
      })

      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "CHANNEL",
          name: "launch-strategy",
          description: "Launch planning",
          isPrivate: false,
        }),
      })

      const res = await createConversation(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.conversation.name).toBe("launch-strategy")
      expect(mocks.broadcastTeamChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "conversation:new" })
      )
    })

    it("creates a channel associated with a project", async () => {
      mocks.db.teamConversation.findFirst.mockResolvedValue(null)
      mocks.db.project.findFirst.mockResolvedValue({ id: "proj-1", workspaceId: "ws-1", name: "UrbanNest Home" })
      mocks.db.teamConversation.create.mockResolvedValue({
        id: "conv-proj",
        workspaceId: "ws-1",
        projectId: "proj-1",
        type: TeamConversationType.CHANNEL,
        name: "urbannest-home",
        description: "Transformation collaboration",
        isPrivate: false,
        project: { id: "proj-1", name: "UrbanNest Home" },
        members: [],
      })

      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "CHANNEL",
          name: "urbannest-home",
          description: "Transformation collaboration",
          projectId: "proj-1",
        }),
      })

      const res = await createConversation(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.conversation.projectId).toBe("proj-1")
      expect(data.conversation.projectName).toBe("UrbanNest Home")
    })

    it("rejects channel creation if project does not belong to workspace", async () => {
      mocks.db.project.findFirst.mockResolvedValue(null)

      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "CHANNEL",
          name: "urbannest-home",
          projectId: "foreign-proj-id",
        }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(400)
    })

    it("rejects channel creation with invalid names", async () => {
      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "CHANNEL",
          name: "INVALID NAME WITH SPACES!",
        }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(400)
    })

    it("creates a 1:1 direct message between workspace teammates", async () => {
      mocks.db.membership.findFirst.mockResolvedValue({ userId: "user-b", organizationId: "org-1" })
      mocks.db.teamConversation.findMany.mockResolvedValue([])
      mocks.db.teamConversation.create.mockResolvedValue({
        id: "dm-1",
        workspaceId: "ws-1",
        type: TeamConversationType.DIRECT_MESSAGE,
        isPrivate: true,
        members: [{ user: mockUserA }, { user: mockUserB }],
      })

      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "DIRECT_MESSAGE",
          recipientUserId: "user-b",
        }),
      })

      const res = await createConversation(req)
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.conversation.type).toBe("DIRECT_MESSAGE")
      expect(mocks.broadcastTeamChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "conversation:new",
          targetUserIds: ["user-a", "user-b"],
        })
      )
    })

    it("prevents cross-tenant DMs if recipient is not in workspace org", async () => {
      mocks.db.membership.findFirst.mockResolvedValue(null) // Not in this organization!

      const req = new Request("http://localhost:3000/api/team-chat/conversations", {
        method: "POST",
        body: JSON.stringify({
          type: "DIRECT_MESSAGE",
          recipientUserId: "outside-tenant-user",
        }),
      })

      const res = await createConversation(req)
      expect(res.status).toBe(404)
    })
  })

  describe("GET /api/team-chat/conversations/:id/messages", () => {
    it("returns messages in chronological order", async () => {
      mocks.requireConversationAccess.mockResolvedValue({
        conversation: { id: "conv-1", workspaceId: "ws-1" },
        user: mockUserA,
      })

      const now = new Date()
      mocks.db.teamMessage.findMany.mockResolvedValue([
        {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: "user-b",
          sender: mockUserB,
          content: "First message",
          editedAt: null,
          createdAt: new Date(now.getTime() - 10000),
          reactions: [],
        },
        {
          id: "msg-2",
          conversationId: "conv-1",
          senderId: "user-a",
          sender: mockUserA,
          content: "Reply message",
          editedAt: null,
          createdAt: now,
          reactions: [{ id: "r-1", emoji: "👍", userId: "user-b", user: { name: "User B" } }],
        },
      ])

      const req = new Request("http://localhost:3000/api/team-chat/conversations/conv-1/messages")
      const res = await getMessages(req, { params: { conversationId: "conv-1" } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.messages).toHaveLength(2)
      expect(data.messages[0].content).toBe("Reply message")
    })
  })

  describe("POST /api/team-chat/conversations/:id/messages", () => {
    it("sends message, updates lastMessageAt, marks read for sender, and broadcasts real-time event", async () => {
      mocks.requireConversationAccess.mockResolvedValue({
        conversation: { id: "conv-1", workspaceId: "ws-1", isPrivate: false, type: TeamConversationType.CHANNEL },
        user: mockUserA,
      })

      const createdMsg = {
        id: "msg-new",
        conversationId: "conv-1",
        senderId: "user-a",
        content: "Deploying to staging now.",
        createdAt: new Date(),
        sender: mockUserA,
        reactions: [],
      }

      mocks.db.teamMessage.create.mockResolvedValue(createdMsg)
      mocks.db.teamConversation.update.mockResolvedValue({})

      const req = new Request("http://localhost:3000/api/team-chat/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ content: "Deploying to staging now." }),
      })

      const res = await sendMessage(req, { params: { conversationId: "conv-1" } })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.message.content).toBe("Deploying to staging now.")
      expect(mocks.db.teamConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "conv-1" } })
      )
      expect(mocks.markConversationRead).toHaveBeenCalledWith("conv-1", "user-a")
      expect(mocks.broadcastTeamChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "message:new",
          workspaceId: "ws-1",
          conversationId: "conv-1",
        })
      )
    })

    it("rejects empty or whitespace-only messages", async () => {
      mocks.requireConversationAccess.mockResolvedValue({
        conversation: { id: "conv-1", workspaceId: "ws-1" },
        user: mockUserA,
      })

      const req = new Request("http://localhost:3000/api/team-chat/conversations/conv-1/messages", {
        method: "POST",
        body: JSON.stringify({ content: "   " }),
      })

      const res = await sendMessage(req, { params: { conversationId: "conv-1" } })
      expect(res.status).toBe(400)
    })
  })

  describe("PATCH & DELETE /api/team-chat/messages/:id", () => {
    it("allows author to edit their own message", async () => {
      mocks.db.teamMessage.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-a",
        content: "Old text",
        deletedAt: null,
        conversation: { workspaceId: "ws-1", id: "conv-1" },
      })

      mocks.db.teamMessage.update.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-a",
        sender: mockUserA,
        content: "Edited text",
        editedAt: new Date(),
        createdAt: new Date(),
        reactions: [],
      })

      const req = new Request("http://localhost:3000/api/team-chat/messages/msg-1", {
        method: "PATCH",
        body: JSON.stringify({ content: "Edited text" }),
      })

      const res = await editMessage(req, { params: { messageId: "msg-1" } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message.content).toBe("Edited text")
      expect(mocks.broadcastTeamChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "message:edit" })
      )
    })

    it("forbids non-authors from editing messages", async () => {
      mocks.db.teamMessage.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-b", // Sender is B, but current user is A
        content: "Original text",
        deletedAt: null,
        conversation: { workspaceId: "ws-1", id: "conv-1" },
      })

      const req = new Request("http://localhost:3000/api/team-chat/messages/msg-1", {
        method: "PATCH",
        body: JSON.stringify({ content: "Hacked text" }),
      })

      const res = await editMessage(req, { params: { messageId: "msg-1" } })
      expect(res.status).toBe(403)
    })

    it("soft-deletes message when authorized", async () => {
      mocks.db.teamMessage.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-a",
        deletedAt: null,
        conversation: {
          workspaceId: "ws-1",
          id: "conv-1",
          workspace: { organization: { memberships: [{ role: OrgRole.ADMIN }] } },
        },
      })
      mocks.db.teamMessage.update.mockResolvedValue({})

      const req = new Request("http://localhost:3000/api/team-chat/messages/msg-1", {
        method: "DELETE",
      })

      const res = await deleteMessage(req, { params: { messageId: "msg-1" } })
      expect(res.status).toBe(200)
      expect(mocks.broadcastTeamChatEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: "message:delete" })
      )
    })
  })

  describe("POST /api/team-chat/conversations/:id/read", () => {
    it("marks conversation as read", async () => {
      mocks.requireConversationAccess.mockResolvedValue({
        conversation: { id: "conv-1", workspaceId: "ws-1" },
        user: mockUserA,
      })

      const req = new Request("http://localhost:3000/api/team-chat/conversations/conv-1/read", {
        method: "POST",
      })

      const res = await markRead(req, { params: { conversationId: "conv-1" } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mocks.markConversationRead).toHaveBeenCalledWith("conv-1", "user-a")
    })
  })

  describe("POST /api/team-chat/messages/:id/reactions", () => {
    it("toggles emoji reaction on message", async () => {
      mocks.db.teamMessage.findUnique.mockResolvedValue({
        id: "msg-1",
        deletedAt: null,
        conversation: {
          workspaceId: "ws-1",
          id: "conv-1",
          isPrivate: false,
          type: TeamConversationType.CHANNEL,
          workspace: { organization: { memberships: [{ role: OrgRole.ADMIN }] } },
          members: [],
        },
      })

      mocks.db.teamMessageReaction.findUnique.mockResolvedValue(null) // Not reacted yet
      mocks.db.teamMessageReaction.create.mockResolvedValue({ id: "react-1" })
      mocks.db.teamMessageReaction.findMany.mockResolvedValue([
        { id: "react-1", emoji: "🚀", userId: "user-a", user: { id: "user-a", name: "User A" } },
      ])

      const req = new Request("http://localhost:3000/api/team-chat/messages/msg-1/reactions", {
        method: "POST",
        body: JSON.stringify({ emoji: "🚀" }),
      })

      const res = await toggleReaction(req, { params: { messageId: "msg-1" } })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reactions).toHaveLength(1)
      expect(data.reactions[0].emoji).toBe("🚀")
    })
  })
})
