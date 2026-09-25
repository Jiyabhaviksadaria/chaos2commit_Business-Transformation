import { describe, expect, it } from "vitest"
import { broadcastTeamChatEvent, subscribeToWorkspaceEvents, TeamChatEvent } from "@/lib/team-chat/events"

describe("Team Chat Realtime Event Engine", () => {
  it("broadcasts messages to subscribers of the same workspace", () => {
    const receivedA: TeamChatEvent[] = []
    const receivedB: TeamChatEvent[] = []

    const unsubA = subscribeToWorkspaceEvents("ws-1", "user-1", (e) => {
      receivedA.push(e)
    })

    const unsubB = subscribeToWorkspaceEvents("ws-1", "user-2", (e) => {
      receivedB.push(e)
    })

    const event: TeamChatEvent = {
      type: "message:new",
      workspaceId: "ws-1",
      conversationId: "conv-1",
      payload: { message: { id: "m-1", content: "Broadcasting" } },
    }

    broadcastTeamChatEvent(event)

    expect(receivedA).toHaveLength(1)
    expect(receivedB).toHaveLength(1)
    expect(receivedA[0].conversationId).toBe("conv-1")

    unsubA()
    unsubB()
  })

  it("isolates events across different workspaces", () => {
    const receivedWs1: TeamChatEvent[] = []
    const receivedWs2: TeamChatEvent[] = []

    const unsub1 = subscribeToWorkspaceEvents("ws-alpha", "user-1", (e) => receivedWs1.push(e))
    const unsub2 = subscribeToWorkspaceEvents("ws-beta", "user-2", (e) => receivedWs2.push(e))

    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: "ws-alpha",
      conversationId: "conv-alpha",
      payload: { text: "Alpha only" },
    })

    expect(receivedWs1).toHaveLength(1)
    expect(receivedWs2).toHaveLength(0) // Workspace Beta receives nothing!

    unsub1()
    unsub2()
  })

  it("filters private DMs so only target users receive the event", () => {
    const receivedUser1: TeamChatEvent[] = []
    const receivedUser2: TeamChatEvent[] = []
    const receivedUser3: TeamChatEvent[] = []

    const unsub1 = subscribeToWorkspaceEvents("ws-1", "user-1", (e) => receivedUser1.push(e))
    const unsub2 = subscribeToWorkspaceEvents("ws-1", "user-2", (e) => receivedUser2.push(e))
    const unsub3 = subscribeToWorkspaceEvents("ws-1", "user-3", (e) => receivedUser3.push(e))

    // Event targeted only to User 1 and User 2
    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: "ws-1",
      conversationId: "dm-1-2",
      targetUserIds: ["user-1", "user-2"],
      payload: { text: "Secret DM" },
    })

    expect(receivedUser1).toHaveLength(1)
    expect(receivedUser2).toHaveLength(1)
    expect(receivedUser3).toHaveLength(0) // User 3 is excluded!

    unsub1()
    unsub2()
    unsub3()
  })
})
