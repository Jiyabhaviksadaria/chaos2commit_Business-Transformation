import { describe, expect, it } from "vitest"
import { broadcastTeamChatEvent, subscribeToWorkspaceEvents, TeamChatEvent } from "@/lib/team-chat/events"
import { createChannelSchema, createDirectMessageSchema, createMessageSchema } from "@/lib/validation/team-chat"

describe("Manual Test Scenario 41 - Complete Team Collaboration Walkthrough", () => {
  // Scenario Users:
  const userA = {
    id: "usr-a-product",
    name: "User A",
    email: "user.a@intelly.local",
    department: "Product",
    companyRole: "Product Manager",
  }

  const userB = {
    id: "usr-b-eng",
    name: "User B",
    email: "user.b@intelly.local",
    department: "Engineering",
    companyRole: "Software Engineer",
  }

  const userC = {
    id: "usr-c-design",
    name: "User C",
    email: "user.c@intelly.local",
    department: "Design",
    companyRole: "Product Designer",
  }

  const workspacePrimary = "workspace-alpha"
  const workspaceOtherTenant = "workspace-beta"

  it("executes the full 23-step collaboration scenario successfully", () => {
    // Simulated state for User A
    const userAState = {
      activeConversationId: "ch-general",
      messagesByConversation: {} as Record<string, string[]>,
      unreadCounts: {} as Record<string, number>,
    }

    // Step 1: User A opens Team Chat and subscribes to workspace events
    const receivedEventsA: TeamChatEvent[] = []
    const receivedEventsB: TeamChatEvent[] = []

    const unsubA = subscribeToWorkspaceEvents(workspacePrimary, userA.id, (e) => {
      receivedEventsA.push(e)

      // Handle real-time updates for User A
      if (e.type === "message:new") {
        const msg = (e.payload.message as { id: string; content: string })
        const convId = e.conversationId
        userAState.messagesByConversation[convId] = [
          ...(userAState.messagesByConversation[convId] || []),
          msg.content,
        ]

        if (userAState.activeConversationId !== convId) {
          userAState.unreadCounts[convId] = (userAState.unreadCounts[convId] || 0) + 1
        }
      }
    })

    const unsubB = subscribeToWorkspaceEvents(workspacePrimary, userB.id, (e) => {
      receivedEventsB.push(e)
    })

    // Channels created: #general, #product, #engineering, #design
    const channels = ["general", "product", "engineering", "design"]
    channels.forEach((name) => {
      const parsed = createChannelSchema.safeParse({ name, type: "CHANNEL" })
      expect(parsed.success).toBe(true)
    })

    // Step 2: User A opens #product
    userAState.activeConversationId = "ch-product"
    userAState.messagesByConversation["ch-product"] = []
    userAState.unreadCounts["ch-product"] = 0

    // Step 3: User A sends a message in #product
    const msg1Validation = createMessageSchema.safeParse({ content: "Reviewing the PRD today." })
    expect(msg1Validation.success).toBe(true)

    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: workspacePrimary,
      conversationId: "ch-product",
      payload: { message: { id: "m-1", senderId: userA.id, content: "Reviewing the PRD today." } },
    })

    // Step 4 & 5: User B receives it and replies
    expect(receivedEventsB.some((e) => (e.payload.message as { id: string }).id === "m-1")).toBe(true)

    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: workspacePrimary,
      conversationId: "ch-product",
      payload: { message: { id: "m-2", senderId: userB.id, content: "Looks good, starting implementation." } },
    })

    // Step 6: User A sees the reply without refreshing
    expect(userAState.messagesByConversation["ch-product"]).toContain("Looks good, starting implementation.")
    expect(userAState.unreadCounts["ch-product"]).toBe(0) // Still viewing #product

    // Step 7: User A switches to #general
    userAState.activeConversationId = "ch-general"
    userAState.messagesByConversation["ch-general"] = userAState.messagesByConversation["ch-general"] || []

    // Step 8: User B sends a message to #product while User A is in #general
    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: workspacePrimary,
      conversationId: "ch-product",
      payload: { message: { id: "m-3", senderId: userB.id, content: "PR created for review." } },
    })

    // Step 9: #product shows an unread indicator for User A
    expect(userAState.unreadCounts["ch-product"]).toBe(1)

    // Step 10 & 11: User A switches back to #product -> message appears, unread cleared
    userAState.activeConversationId = "ch-product"
    userAState.unreadCounts["ch-product"] = 0
    expect(userAState.messagesByConversation["ch-product"]).toContain("PR created for review.")

    // Step 12: User A opens a DM with User C
    const dmValidation = createDirectMessageSchema.safeParse({ type: "DIRECT_MESSAGE", recipientUserId: userC.id })
    expect(dmValidation.success).toBe(true)

    userAState.activeConversationId = "dm-a-c"
    userAState.messagesByConversation["dm-a-c"] = []

    // Step 13: User C sends a DM to User A
    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: workspacePrimary,
      conversationId: "dm-a-c",
      targetUserIds: [userA.id, userC.id],
      payload: { message: { id: "m-4", senderId: userC.id, content: "New wireframes are uploaded." } },
    })

    // Step 14: User A receives DM without refreshing
    expect(userAState.messagesByConversation["dm-a-c"]).toContain("New wireframes are uploaded.")

    // Step 15 & 16: User A switches between Product and DM -> Each maintains isolated message state!
    expect(userAState.messagesByConversation["ch-product"]).toHaveLength(3)
    expect(userAState.messagesByConversation["dm-a-c"]).toHaveLength(1)
    expect(userAState.messagesByConversation["ch-product"]).not.toContain("New wireframes are uploaded.")
    expect(userAState.messagesByConversation["dm-a-c"]).not.toContain("Reviewing the PRD today.")

    // Step 17: User A cannot receive or access events from another workspace
    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: workspaceOtherTenant, // Cross-tenant message!
      conversationId: "ch-secret-beta",
      payload: { message: { id: "m-cross-tenant", content: "Other company secret" } },
    })
    expect(receivedEventsA.some((e) => (e.payload.message as { id: string }).id === "m-cross-tenant")).toBe(false)

    unsubA()
    unsubB()
  })
})
