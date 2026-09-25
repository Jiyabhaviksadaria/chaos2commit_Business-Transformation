import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ChatApiError,
  createChat,
  deleteChat,
  getChat,
  getChats,
  renameChat,
  sendChatMessage,
} from "@/lib/api/ai-chats"

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response
}

const apiChat = {
  id: "chat-1",
  title: "CRM Analysis",
  kind: "CONSULTANT" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
}

const apiMessage = {
  id: "message-1",
  role: "ASSISTANT" as const,
  content: "Saved answer",
  createdAt: "2026-01-02T00:00:00.000Z",
}

describe("AI chat API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads lightweight chat summaries with authenticated browser credentials", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ chats: [{ ...apiChat, messageCount: 3 }] }))

    const result = await getChats()

    expect(result).toEqual([{ ...apiChat, messageCount: 3 }])
    expect(fetch).toHaveBeenCalledWith("/api/ai/chats", expect.objectContaining({
      credentials: "include",
      cache: "no-store",
    }))
  })

  it("creates a chat without sending ownership fields", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ chat: apiChat }, 201))

    await createChat()

    expect(fetch).toHaveBeenCalledWith("/api/ai/chats", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({}),
    }))
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).not.toContain("userId")
  })

  it("normalizes API roles for the existing lowercase UI", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ chat: apiChat, messages: [apiMessage] }))

    const result = await getChat(apiChat.id)

    expect(result.messages[0]).toEqual({
      id: apiMessage.id,
      role: "assistant",
      content: apiMessage.content,
      createdAt: apiMessage.createdAt,
    })
    expect(fetch).toHaveBeenCalledWith(`/api/ai/chats/${apiChat.id}`, expect.objectContaining({
      cache: "no-store",
    }))
  })

  it("uses PATCH only for a title update", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ chat: { ...apiChat, title: "Renamed" } }))

    await renameChat(apiChat.id, "Renamed")

    expect(fetch).toHaveBeenCalledWith(`/api/ai/chats/${apiChat.id}`, expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ title: "Renamed" }),
    }))
  })

  it("uses DELETE for a conversation", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ success: true }))

    await deleteChat(apiChat.id)

    expect(fetch).toHaveBeenCalledWith(`/api/ai/chats/${apiChat.id}`, expect.objectContaining({
      method: "DELETE",
    }))
  })

  it("sends only message content and normalizes both returned messages", async () => {
    vi.mocked(fetch).mockResolvedValue(response({
      userMessage: { ...apiMessage, id: "user-1", role: "USER", content: "Question" },
      assistantMessage: apiMessage,
    }))

    const result = await sendChatMessage(apiChat.id, "Question")

    expect(fetch).toHaveBeenCalledWith(`/api/ai/chats/${apiChat.id}/messages`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ content: "Question" }),
    }))
    expect(result.userMessage.role).toBe("user")
    expect(result.assistantMessage.role).toBe("assistant")
  })

  it("surfaces the backend error message without exposing response internals", async () => {
    vi.mocked(fetch).mockResolvedValue(response({ error: "Chat not found." }, 404))

    await expect(getChat("missing")).rejects.toEqual(expect.objectContaining<Partial<ChatApiError>>({
      name: "ChatApiError",
      status: 404,
      message: "Chat not found.",
    }))
  })
})
