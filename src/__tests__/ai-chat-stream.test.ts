import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  ChatStreamError,
  createSseEventParser,
  streamChatMessage,
} from "@/lib/api/ai-chat-stream"

const userMessage = {
  id: "user-1",
  role: "USER" as const,
  content: "Question",
  createdAt: "2026-01-01T00:00:00.000Z",
}

const assistantMessage = {
  id: "assistant-1",
  role: "ASSISTANT" as const,
  content: "Complete answer",
  createdAt: "2026-01-01T00:00:01.000Z",
}

function streamResponse(parts: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
  return {
    ok: status >= 200 && status < 300,
    status,
    body,
    json: async () => ({ error: "Generation failed." }),
  } as Response
}

describe("AI chat SSE client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("parses events split across network chunks and CRLF boundaries", () => {
    const parser = createSseEventParser()
    expect(parser.push("event: user\r\ndata: {\"userMessage\":{\"id\":\"user-1\",\"role\":\"USER\",\"content\":\"Question\",\"createdAt\":\"2026-01-01T00:00:00.000Z\"}}\r\n")).toEqual([])
    expect(parser.push("\r\n")).toEqual([
      { type: "user", requestId: undefined, userMessage: { ...userMessage, role: "user" } },
    ])
    expect(parser.push("event: chunk\ndata: {\"text\":\"Hello \"}\n\nevent: chunk\ndata: {\"text\":\"world\"}\n\n")).toEqual([
      { type: "chunk", requestId: undefined, text: "Hello " },
      { type: "chunk", requestId: undefined, text: "world" },
    ])
  })

  it("consumes user, chunk, and done events from one response", async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse([
      `event: user\ndata: ${JSON.stringify({ userMessage })}\n\n`,
      `event: chunk\ndata: ${JSON.stringify({ text: "Hello " })}\n\n`,
      `event: chunk\ndata: ${JSON.stringify({ text: "world" })}\n\n`,
      `event: done\ndata: ${JSON.stringify({ chatId: "chat-1", messageId: assistantMessage.id, assistantMessage, updatedAt: "2026-01-01T00:00:02.000Z" })}\n\n`,
    ]))

    const events = []
    for await (const event of streamChatMessage("chat-1", "Question", { requestId: "req-1" })) events.push(event)

    expect(events).toEqual([
      { type: "user", requestId: undefined, userMessage: { ...userMessage, role: "user" } },
      { type: "chunk", requestId: undefined, text: "Hello " },
      { type: "chunk", requestId: undefined, text: "world" },
      {
        type: "done",
        requestId: undefined,
        chatId: "chat-1",
        messageId: assistantMessage.id,
        updatedAt: "2026-01-01T00:00:02.000Z",
        assistantMessage: { ...assistantMessage, role: "assistant" },
      },
    ])
    expect(fetch).toHaveBeenCalledWith("/api/ai/chats/chat-1/messages", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Accept: "text/event-stream", "X-Chat-Request-Id": "req-1" }),
      body: JSON.stringify({ content: "Question" }),
    }))
  })

  it("surfaces a stream error event without throwing provider internals", async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse([
      `event: error\ndata: ${JSON.stringify({ message: "Generation failed. Retry.", code: "GENERATION_FAILED" })}\n\n`,
    ]))

    const events = []
    for await (const event of streamChatMessage("chat-1", "Question")) events.push(event)

    expect(events).toEqual([{ type: "error", requestId: undefined, message: "Generation failed. Retry.", code: "GENERATION_FAILED" }])
  })

  it("rejects a stream that closes without a done event", async () => {
    vi.mocked(fetch).mockResolvedValue(streamResponse([
      `event: chunk\ndata: ${JSON.stringify({ text: "partial" })}\n\n`,
    ]))

    const consume = async () => {
      for await (const event of streamChatMessage("chat-1", "Question")) {
        expect(event).toBeDefined()
      }
    }
    await expect(consume()).rejects.toBeInstanceOf(ChatStreamError)
  })

  it("converts non-success responses into safe ChatApiError values", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      body: null,
      json: async () => ({}),
    } as Response)

    const consume = async () => {
      for await (const event of streamChatMessage("chat-1", "Question")) {
        expect(event).toBeDefined()
      }
    }
    await expect(consume()).rejects.toEqual(expect.objectContaining({
      name: "ChatApiError",
      status: 429,
      message: "Too many requests. Please try again shortly.",
    }))
  })
})
