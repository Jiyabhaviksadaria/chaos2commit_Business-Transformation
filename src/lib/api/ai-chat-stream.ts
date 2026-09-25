import { ChatApiError, normalizeChatMessage, type ChatMessage } from "@/lib/api/ai-chats"

export type ChatStreamEvent =
  | {
      type: "user"
      requestId?: string
      userMessage: ChatMessage
    }
  | {
      type: "chunk"
      requestId?: string
      text: string
    }
  | {
      type: "done"
      requestId?: string
      chatId: string
      messageId: string
      updatedAt?: string
      assistantMessage: ChatMessage
    }
  | {
      type: "error"
      requestId?: string
      message: string
      code?: string
    }
  | {
      type: "cancelled"
      requestId?: string
    }

export class ChatStreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ChatStreamError"
  }
}

type StreamOptions = {
  signal?: AbortSignal
  requestId?: string
  retryMessageId?: string
}

type StreamEventPayload = Record<string, unknown>

function isRecord(value: unknown): value is StreamEventPayload {
  return typeof value === "object" && value !== null
}

function readString(payload: StreamEventPayload, key: string): string | undefined {
  const value = payload[key]
  return typeof value === "string" ? value : undefined
}

function normalizeApiMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.content !== "string" || typeof value.createdAt !== "string") return null
  if (value.role !== "USER" && value.role !== "ASSISTANT" && value.role !== "SYSTEM") return null
  return normalizeChatMessage({
    id: value.id,
    role: value.role,
    content: value.content,
    createdAt: value.createdAt,
  })
}

function parseEvent(type: string, data: string): ChatStreamEvent | null {
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return null
  }
  if (!isRecord(payload)) return null

  const requestId = readString(payload, "requestId")
  if (type === "user") {
    const userMessage = normalizeApiMessage(payload.userMessage)
    return userMessage ? { type: "user", requestId, userMessage } : null
  }
  if (type === "chunk") {
    const text = readString(payload, "text")
    return text === undefined ? null : { type: "chunk", requestId, text }
  }
  if (type === "done") {
    const assistantMessage = normalizeApiMessage(payload.assistantMessage)
    const chatId = readString(payload, "chatId")
    const messageId = readString(payload, "messageId")
    if (!assistantMessage || !chatId || !messageId) return null
    return {
      type: "done",
      requestId,
      chatId,
      messageId,
      updatedAt: readString(payload, "updatedAt"),
      assistantMessage,
    }
  }
  if (type === "error") {
    return {
      type: "error",
      requestId,
      message: readString(payload, "message") ?? "Generation failed.",
      code: readString(payload, "code"),
    }
  }
  if (type === "cancelled") return { type: "cancelled", requestId }
  return null
}

function parseSseBlock(block: string): ChatStreamEvent | null {
  let type = "message"
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith("event:")) type = line.slice(6).trim()
    if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""))
  }
  if (dataLines.length === 0) return null
  return parseEvent(type, dataLines.join("\n"))
}

export function createSseEventParser() {
  let buffer = ""

  function takeEvents(final = false): ChatStreamEvent[] {
    buffer = buffer.replace(/\r\n/g, "\n")
    const events: ChatStreamEvent[] = []
    let boundary = buffer.indexOf("\n\n")
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = parseSseBlock(block)
      if (event) events.push(event)
      boundary = buffer.indexOf("\n\n")
    }
    if (final && buffer.trim()) {
      const event = parseSseBlock(buffer)
      if (event) events.push(event)
      buffer = ""
    }
    return events
  }

  return {
    push(text: string): ChatStreamEvent[] {
      buffer += text
      return takeEvents()
    },
    finish(): ChatStreamEvent[] {
      return takeEvents(true)
    },
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) return payload.error
  if (status === 401) return "Authentication required."
  if (status === 429) return "Too many requests. Please try again shortly."
  return "Generation failed."
}

export async function* streamChatMessage(
  sessionId: string,
  content: string,
  options: StreamOptions = {},
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`/api/ai/chats/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...(options.requestId ? { "X-Chat-Request-Id": options.requestId } : {}),
    },
    body: JSON.stringify({
      content,
      ...(options.retryMessageId ? { retryMessageId: options.retryMessageId } : {}),
    }),
  })

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new ChatApiError(errorMessage(payload, response.status), response.status)
  }
  if (!response.body) throw new ChatStreamError("The chat stream did not return a body.")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseEventParser()
  let sawDone = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        const finalEvents = parser.push(decoder.decode())
        for (const event of finalEvents) {
          if (event.type === "done") sawDone = true
          yield event
          if (event.type === "error" || event.type === "cancelled") return
        }
        break
      }
      const events = parser.push(decoder.decode(value, { stream: true }))
      for (const event of events) {
        if (event.type === "done") sawDone = true
        yield event
        if (event.type === "error" || event.type === "cancelled") return
      }
    }

    for (const event of parser.finish()) {
      if (event.type === "done") sawDone = true
      yield event
      if (event.type === "error" || event.type === "cancelled") return
    }
  } finally {
    reader.releaseLock()
  }

  if (!sawDone) throw new ChatStreamError("Generation stream ended before completion.")
}
