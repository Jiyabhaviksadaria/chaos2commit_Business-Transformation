import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatRole, ChatSessionKind } from "@prisma/client"

type SessionRecord = {
  id: string
  userId: string
  projectId: string | null
  kind: string
  title: string
  createdAt: Date
  updatedAt: Date
}

type MessageRecord = {
  id: string
  sessionId: string
  role: string
  content: string
  createdAt: Date
}

type JsonObject = { [key: string]: unknown }

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  chatStream: vi.fn(),
  sessions: [] as Array<{
    id: string
    userId: string
    projectId: string | null
    kind: string
    title: string
    createdAt: Date
    updatedAt: Date
  }>,
  messages: [] as Array<{
    id: string
    sessionId: string
    role: string
    content: string
    createdAt: Date
  }>,
  db: {
    chatSession: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/access", () => ({
  requireUser: mocks.requireUser,
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}))

vi.mock("@/lib/ai/orchestrator", () => ({
  chatStream: mocks.chatStream,
}))

import { GET as getChats, POST as createChat } from "@/app/api/ai/chats/route"
import {
  DELETE as deleteChat,
  GET as getChat,
  PATCH as renameChat,
} from "@/app/api/ai/chats/[sessionId]/route"
import { POST as sendMessage } from "@/app/api/ai/chats/[sessionId]/messages/route"
import { DEFAULT_CHAT_TITLE, generateChatTitle } from "@/lib/ai/chat-title"
import { BUSINESS_COPILOT_SYSTEM_PROMPT } from "@/lib/ai/prompts/business-copilot"

function request(body?: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/ai/chats", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function streamRequest(body: unknown, signal?: AbortSignal): Request {
  return new Request("http://localhost/api/ai/chats/chat/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-chat-request-id": "request-1",
    },
    body: JSON.stringify(body),
    signal,
  })
}

function context(sessionId = "chat-a") {
  return { params: { sessionId } }
}

function matches(record: SessionRecord, where: Record<string, unknown>) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "projectId" && value === null) return record.projectId === null
    return (record as unknown as Record<string, unknown>)[key] === value
  })
}

function selectSession(session: SessionRecord, select: Record<string, unknown> | undefined) {
  const result: Record<string, unknown> = {}
  for (const field of ["id", "title", "kind", "createdAt", "updatedAt"]) {
    if (select?.[field]) result[field] = session[field as keyof SessionRecord]
  }
  if (select?.messages) {
    result.messages = mocks.messages
      .filter((message) => message.sessionId === session.id)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
      .map((message) => ({ ...message }))
  }
  return result
}

function seedSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const now = new Date()
  const session: SessionRecord = {
    id: `chat-${mocks.sessions.length + 1}`,
    userId: "user-a",
    projectId: null,
    kind: ChatSessionKind.CONSULTANT,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
  mocks.sessions.push(session)
  return session
}

function seedMessage(sessionId: string, role: string, content: string, createdAt = new Date()): MessageRecord {
  const message: MessageRecord = {
    id: `message-${mocks.messages.length + 1}`,
    sessionId,
    role,
    content,
    createdAt,
  }
  mocks.messages.push(message)
  return message
}

function authError() {
  const error = new Error("unauthenticated")
  error.name = "AuthError"
  return error
}

function setUser(id: string) {
  mocks.requireUser.mockResolvedValue({ id })
}

async function json(response: Response): Promise<JsonObject> {
  return (await response.json()) as JsonObject
}

beforeEach(() => {
  mocks.sessions.length = 0
  mocks.messages.length = 0
  vi.clearAllMocks()
  setUser("user-a")

  mocks.db.chatSession.findMany.mockImplementation(async (args: {
    where: Record<string, unknown>
    orderBy?: Array<{ updatedAt?: string; id?: string }>
    include?: { _count?: { select?: { messages?: boolean } } }
  }) => {
    const result = mocks.sessions.filter((session) => matches(session, args.where))
    result.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime() || right.id.localeCompare(left.id))
    return result.map((session) => ({
      ...selectSession(session, { id: true, title: true, kind: true, createdAt: true, updatedAt: true }),
      _count: { messages: mocks.messages.filter((message) => message.sessionId === session.id).length },
    }))
  })

  mocks.db.chatSession.findFirst.mockImplementation(async (args: {
    where: Record<string, unknown>
    select?: Record<string, unknown>
  }) => {
    const session = mocks.sessions.find((candidate) => matches(candidate, args.where))
    return session ? selectSession(session, args.select) : null
  })

  mocks.db.chatSession.create.mockImplementation(async (args: {
    data: Record<string, unknown>
    select?: Record<string, unknown>
  }) => {
    const now = new Date()
    const session: SessionRecord = {
      id: `chat-${mocks.sessions.length + 1}`,
      userId: String(args.data.userId),
      projectId: args.data.projectId === null ? null : String(args.data.projectId),
      kind: String(args.data.kind),
      title: String(args.data.title),
      createdAt: now,
      updatedAt: now,
    }
    mocks.sessions.push(session)
    return selectSession(session, args.select)
  })

  mocks.db.chatSession.update.mockImplementation(async (args: {
    where: Record<string, unknown>
    data: Record<string, unknown>
    select?: Record<string, unknown>
  }) => {
    const session = mocks.sessions.find((candidate) => matches(candidate, args.where))
    if (!session) throw new Error("not found")
    if (typeof args.data.title === "string") session.title = args.data.title
    if (args.data.updatedAt instanceof Date) session.updatedAt = args.data.updatedAt
    return selectSession(session, args.select)
  })

  mocks.db.chatSession.deleteMany.mockImplementation(async (args: { where: Record<string, unknown> }) => {
    const remaining = mocks.sessions.filter((session) => !matches(session, args.where))
    const count = mocks.sessions.length - remaining.length
    if (count > 0) {
      const deletedIds = new Set(mocks.sessions.filter((session) => matches(session, args.where)).map((session) => session.id))
      mocks.sessions.splice(0, mocks.sessions.length, ...remaining)
      for (let index = mocks.messages.length - 1; index >= 0; index -= 1) {
        if (deletedIds.has(mocks.messages[index].sessionId)) mocks.messages.splice(index, 1)
      }
    }
    return { count }
  })

  mocks.db.chatMessage.create.mockImplementation(async (args: {
    data: Record<string, unknown>
    select?: Record<string, unknown>
  }) => {
    const message = seedMessage(String(args.data.sessionId), String(args.data.role), String(args.data.content))
    const result: Record<string, unknown> = {}
    for (const field of ["id", "role", "content", "createdAt"]) {
      if (args.select?.[field]) result[field] = message[field as keyof MessageRecord]
    }
    return result
  })

  mocks.chatStream.mockImplementation(async function* () {
    yield "CRM "
    yield "analysis"
  })
})

describe("global AI chat API", () => {
  it("rejects unauthenticated chat creation", async () => {
    mocks.requireUser.mockRejectedValue(authError())

    const response = await createChat(request({ title: "Private" }))

    expect(response.status).toBe(401)
    expect((await json(response)).error).toBe("Authentication required.")
    expect(mocks.db.chatSession.create).not.toHaveBeenCalled()
  })

  it("creates an owned global CONSULTANT chat", async () => {
    const response = await createChat(request({ title: "  CRM Review  ", userId: "attacker" }))

    expect(response.status).toBe(400)
    expect(mocks.sessions).toHaveLength(0)

    const malformed = new Request("http://localhost/api/ai/chats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    })
    const malformedResponse = await createChat(malformed)
    expect(malformedResponse.status).toBe(400)
    expect(mocks.sessions).toHaveLength(0)

    const created = await createChat(request({ title: "  CRM Review  " }))
    expect(created.status).toBe(201)
    expect(mocks.db.chatSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "user-a",
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
        title: "CRM Review",
      }),
    }))
  })

  it("lists only the current user's global chats, ordered by recent activity", async () => {
    const older = seedSession({ id: "older", updatedAt: new Date("2026-01-01T00:00:00Z") })
    const newer = seedSession({ id: "newer", updatedAt: new Date("2026-02-01T00:00:00Z") })
    seedSession({ id: "other-user", userId: "user-b" })
    seedSession({ id: "project-chat", projectId: "project-1" })
    seedSession({ id: "discovery", kind: ChatSessionKind.DISCOVERY })
    seedMessage(older.id, ChatRole.USER, "one")
    seedMessage(newer.id, ChatRole.USER, "one")
    seedMessage(newer.id, ChatRole.ASSISTANT, "two")

    const response = await getChats()
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.chats).toEqual([
      expect.objectContaining({ id: "newer", messageCount: 2 }),
      expect.objectContaining({ id: "older", messageCount: 1 }),
    ])
  })

  it("does not expose another user's chat", async () => {
    const session = seedSession({ id: "private-chat", userId: "user-b" })
    seedMessage(session.id, ChatRole.USER, "secret")
    setUser("user-a")

    const response = await getChat(request(), context(session.id))

    expect(response.status).toBe(404)
    expect((await json(response)).error).toBe("Chat not found.")
  })

  it("loads an owned chat and its messages oldest first", async () => {
    const session = seedSession({ id: "owned-chat", title: "CRM Review" })
    const second = new Date("2026-01-02T00:00:00Z")
    const first = new Date("2026-01-01T00:00:00Z")
    seedMessage(session.id, ChatRole.ASSISTANT, "second", second)
    seedMessage(session.id, ChatRole.USER, "first", first)

    const response = await getChat(request(), context(session.id))
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.chat).toEqual(expect.objectContaining({ id: session.id, title: "CRM Review" }))
    expect((body.messages as Array<{ content: string }>).map((message) => message.content)).toEqual(["first", "second"])
  })

  it("renames an owned chat without accepting arbitrary fields", async () => {
    const session = seedSession({ id: "rename-chat" })

    const invalid = await renameChat(request({ title: "Renamed", userId: "user-b" }, "PATCH"), context(session.id))
    expect(invalid.status).toBe(400)

    const response = await renameChat(request({ title: "  Renamed chat  " }, "PATCH"), context(session.id))
    expect(response.status).toBe(200)
    expect((await json(response)).chat).toEqual(expect.objectContaining({ title: "Renamed chat" }))
    expect(session.title).toBe("Renamed chat")
  })

  it("does not allow renaming another user's chat", async () => {
    const session = seedSession({ id: "other-rename", userId: "user-b" })
    setUser("user-a")

    const response = await renameChat(request({ title: "Stolen" }, "PATCH"), context(session.id))

    expect(response.status).toBe(404)
    expect(session.title).toBe("New chat")
    expect(mocks.db.chatSession.update).not.toHaveBeenCalled()
  })

  it("deletes an owned chat and its dependent messages", async () => {
    const session = seedSession({ id: "delete-chat" })
    seedMessage(session.id, ChatRole.USER, "delete me")

    const response = await deleteChat(request(undefined, "DELETE"), context(session.id))

    expect(response.status).toBe(200)
    expect(await json(response)).toEqual({ success: true })
    expect(mocks.sessions).toHaveLength(0)
    expect(mocks.messages).toHaveLength(0)
  })

  it("does not allow deleting another user's chat", async () => {
    const session = seedSession({ id: "other-delete", userId: "user-b" })
    seedMessage(session.id, ChatRole.USER, "keep me")

    const response = await deleteChat(request(undefined, "DELETE"), context(session.id))

    expect(response.status).toBe(404)
    expect(mocks.sessions).toHaveLength(1)
    expect(mocks.messages).toHaveLength(1)
  })

  it("persists the user and assistant messages after a successful generation", async () => {
    const session = seedSession({ id: "send-chat" })
    seedMessage(session.id, ChatRole.ASSISTANT, "Earlier answer", new Date("2026-01-01T00:00:00Z"))
    mocks.chatStream.mockImplementation(async function* () {
      yield "CRM "
      yield "analysis"
    })

    const response = await sendMessage(request({ content: "Analyze the bottlenecks in our CRM lead management process" }), context(session.id))
    const body = await json(response)

    expect(response.status).toBe(200)
    expect(body.userMessage).toEqual(expect.objectContaining({ role: ChatRole.USER, content: "Analyze the bottlenecks in our CRM lead management process" }))
    expect(body.assistantMessage).toEqual(expect.objectContaining({ role: ChatRole.ASSISTANT, content: "CRM analysis" }))
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toHaveLength(3)
    expect(mocks.chatStream).toHaveBeenCalledWith({
      system: BUSINESS_COPILOT_SYSTEM_PROMPT,
      userId: "user-a",
      messages: [
        { role: "assistant", content: "Earlier answer" },
        { role: "user", content: "Analyze the bottlenecks in our CRM lead management process" },
      ],
    })
    expect(session.title).toBe("CRM Lead Management")
  })

  it("constructs ordered multi-turn context for a natural follow-up", async () => {
    const session = seedSession({ id: "follow-up-context" })
    mocks.chatStream.mockImplementation(async function* () {
      yield "Inventory analysis"
    })

    await sendMessage(request({ content: "Analyze our inventory problem" }), context(session.id))
    await sendMessage(request({ content: "What about the technical side?" }), context(session.id))

    expect(mocks.chatStream).toHaveBeenLastCalledWith(expect.objectContaining({
      system: BUSINESS_COPILOT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: "Analyze our inventory problem" },
        { role: "assistant", content: "Inventory analysis" },
        { role: "user", content: "What about the technical side?" },
      ],
    }))
  })

  it.each([
    "Our retail store has inventory problems because the website and physical store do not share stock.",
    "Inventory problem kya hai?",
    "Inventory ni problem su che?",
    "Aa problem nu technical solution shu hase?",
    "Can you explain this in Hindi?",
    "Isko thoda simple Gujarati ma samjhao",
    "Isko thoda simple language mein samjhao",
  ])("accepts a free-form multilingual prompt: %s", async (content) => {
    const session = seedSession()
    const response = await sendMessage(request({ content }), context(session.id))

    expect(response.status).toBe(200)
    expect(mocks.chatStream).toHaveBeenCalledWith(expect.objectContaining({
      system: BUSINESS_COPILOT_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }))
  })

  it("passes the system prompt without persisting it as a ChatMessage", async () => {
    const session = seedSession({ id: "system-prompt-chat" })

    const response = await sendMessage(streamRequest({ content: "Explain the problem" }), context(session.id))
    await response.text()

    expect(response.status).toBe(200)
    expect(mocks.chatStream).toHaveBeenCalledWith(expect.objectContaining({
      system: BUSINESS_COPILOT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Explain the problem" }],
    }))
    expect(mocks.messages.filter((message) => message.sessionId === session.id).map((message) => message.role)).toEqual([
      ChatRole.USER,
      ChatRole.ASSISTANT,
    ])
  })

  it("streams chunks and persists exactly one assistant message", async () => {
    const session = seedSession({ id: "stream-chat" })
    mocks.chatStream.mockImplementation(async function* () {
      yield "CRM "
      yield "analysis"
    })

    const response = await sendMessage(streamRequest({ content: "Analyze CRM bottlenecks" }), context(session.id))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/event-stream")
    expect(body).toContain('event: user')
    expect(body).toContain('"text":"CRM "')
    expect(body).toContain('"text":"analysis"')
    expect(body).toContain('event: done')
    expect(body).toContain('"content":"CRM analysis"')
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toEqual([
      expect.objectContaining({ role: ChatRole.USER, content: "Analyze CRM bottlenecks" }),
      expect.objectContaining({ role: ChatRole.ASSISTANT, content: "CRM analysis" }),
    ])
  })

  it("does not persist a partial assistant response when streaming fails", async () => {
    const session = seedSession({ id: "partial-stream-chat" })
    mocks.chatStream.mockImplementation(async function* () {
      yield "Partial provider output"
      throw new Error("provider secret should not be returned")
    })

    const response = await sendMessage(streamRequest({ content: "Analyze this" }), context(session.id))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('event: chunk')
    expect(body).toContain('event: error')
    expect(body).toContain("Generation failed. Retry.")
    expect(body).not.toContain("provider secret")
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toEqual([
      expect.objectContaining({ role: ChatRole.USER, content: "Analyze this" }),
    ])
  })

  it("does not persist an assistant message when the client cancels a stream", async () => {
    const session = seedSession({ id: "cancelled-stream-chat" })
    const requestController = new AbortController()
    mocks.chatStream.mockImplementation(async function* (options: { signal?: AbortSignal }) {
      yield "Partial output before cancellation"
      await new Promise<void>((resolve) => {
        if (options.signal?.aborted) {
          resolve()
          return
        }
        options.signal?.addEventListener("abort", () => resolve(), { once: true })
      })
      const error = new Error("aborted")
      error.name = "AbortError"
      throw error
    })

    const response = await sendMessage(
      streamRequest({ content: "Cancel this generation" }, requestController.signal),
      context(session.id),
    )
    await vi.waitFor(() => expect(mocks.chatStream).toHaveBeenCalled())
    requestController.abort()
    const body = await response.text()

    expect(body).not.toContain("event: done")
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toEqual([
      expect.objectContaining({ role: ChatRole.USER, content: "Cancel this generation" }),
    ])
  })

  it("retries the persisted user message without creating a duplicate user message", async () => {
    const session = seedSession({ id: "retry-stream-chat" })
    const savedUserMessage = seedMessage(session.id, ChatRole.USER, "Retry this question")
    mocks.chatStream.mockImplementation(async function* () {
      yield "Retry answer"
    })

    const response = await sendMessage(
      streamRequest({ content: "Retry this question", retryMessageId: savedUserMessage.id }),
      context(session.id),
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('"content":"Retry answer"')
    expect(mocks.messages.filter((message) => message.sessionId === session.id && message.role === ChatRole.USER)).toHaveLength(1)
    expect(mocks.messages.filter((message) => message.sessionId === session.id && message.role === ChatRole.ASSISTANT)).toHaveLength(1)
    expect(mocks.chatStream).toHaveBeenCalledWith({
      system: BUSINESS_COPILOT_SYSTEM_PROMPT,
      userId: "user-a",
      messages: [{ role: "user", content: "Retry this question" }],
      signal: expect.any(AbortSignal),
    })
  })
  it("does not overwrite a manually renamed chat title on later messages", async () => {
    const session = seedSession({ id: "manual-title", title: "My private plan" })

    const response = await sendMessage(request({ content: "Analyze the next steps" }), context(session.id))

    expect(response.status).toBe(200)
    expect(session.title).toBe("My private plan")
  })

  it("does not call the AI or mutate another user's chat when sending a message", async () => {
    const session = seedSession({ id: "other-send", userId: "user-b" })
    setUser("user-a")

    const response = await sendMessage(request({ content: "Can you read this?" }), context(session.id))

    expect(response.status).toBe(404)
    expect(mocks.chatStream).not.toHaveBeenCalled()
    expect(mocks.messages).toHaveLength(0)
  })

  it("rejects empty message content", async () => {
    const session = seedSession({ id: "empty-message" })

    const response = await sendMessage(request({ content: "   \n  " }), context(session.id))

    expect(response.status).toBe(400)
    expect(mocks.db.chatMessage.create).not.toHaveBeenCalled()
    expect(mocks.chatStream).not.toHaveBeenCalled()
  })

  it("rejects oversized message content", async () => {
    const session = seedSession({ id: "large-message" })

    const response = await sendMessage(request({ content: "x".repeat(20_001) }), context(session.id))

    expect(response.status).toBe(400)
    expect(mocks.db.chatMessage.create).not.toHaveBeenCalled()
  })

  it("keeps the user message but does not create a fake assistant message on AI failure", async () => {
    const session = seedSession({ id: "failed-generation" })
    mocks.chatStream.mockImplementation(async function* () {
      throw new Error("provider secret should not be returned")
    })

    const response = await sendMessage(request({ content: "Analyze this" }), context(session.id))
    const body = await json(response)

    expect(response.status).toBe(500)
    expect(body.error).toContain("Your message was saved")
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toEqual([
      expect.objectContaining({ role: ChatRole.USER, content: "Analyze this" }),
    ])
  })

  it("treats the orchestrator unavailable response as a failed generation", async () => {
    const session = seedSession({ id: "unavailable-generation" })
    mocks.chatStream.mockImplementation(async function* () {
      yield "partial provider output"
      yield "AI providers unavailable."
    })

    const response = await sendMessage(request({ content: "Analyze this" }), context(session.id))

    expect(response.status).toBe(500)
    expect(mocks.messages.filter((message) => message.sessionId === session.id)).toHaveLength(1)
  })

  it("returns messages in chronological order after multiple sends", async () => {
    const session = seedSession({ id: "ordered-messages" })
    const firstTime = new Date("2026-01-01T00:00:00Z")
    const secondTime = new Date("2026-01-02T00:00:00Z")
    mocks.db.chatSession.findFirst.mockImplementation(async (args: {
      where: Record<string, unknown>
      select?: Record<string, unknown>
    }) => {
      const found = mocks.sessions.find((candidate) => matches(candidate, args.where))
      if (!found) return null
      const selected = selectSession(found, args.select)
      if (args.select?.messages) {
        selected.messages = [
          { id: "m1", role: ChatRole.USER, content: "first", createdAt: firstTime },
          { id: "m2", role: ChatRole.ASSISTANT, content: "answer", createdAt: secondTime },
        ]
      }
      return selected
    })

    const response = await getChat(request(), context(session.id))
    const body = await json(response)

    expect(response.status).toBe(200)
    expect((body.messages as Array<{ content: string }>).map((message) => message.content)).toEqual(["first", "answer"])
  })

  it("does not convert or expose an existing project-specific CONSULTANT session as a global chat", async () => {
    const projectSession = seedSession({ id: "project-session", projectId: "project-1" })

    const listResponse = await getChats()
    const listBody = await json(listResponse)
    const detailResponse = await getChat(request(), context(projectSession.id))

    expect((listBody.chats as Array<{ id: string }>).map((chat) => chat.id)).not.toContain(projectSession.id)
    expect(detailResponse.status).toBe(404)
    expect(projectSession.projectId).toBe("project-1")
  })

  it("generates a deterministic, whitespace-safe title without copying common secrets", () => {
    expect(generateChatTitle("  Analyze\n\t the bottlenecks in our CRM   lead management process  ")).toBe("CRM Lead Management")
    expect(generateChatTitle("My email is alice@example.com and my password is hunter2")).not.toContain("alice@example.com")
    expect(generateChatTitle("My email is alice@example.com and my password is hunter2")).not.toContain("hunter2")
    expect(generateChatTitle("The key is gsk_1234567890abcdef")).not.toContain("gsk_1234567890abcdef")
    expect(generateChatTitle("hello")).toBe(DEFAULT_CHAT_TITLE)
    expect(generateChatTitle("word ".repeat(100)).length).toBeLessThanOrEqual(80)
  })

  it("keeps useful titles for free-form English, Hindi, and Gujarati prompts", () => {
    expect(generateChatTitle("Our retail store keeps overselling products because inventory isn't synchronized.")).toContain("Retail")
    expect(generateChatTitle("Inventory problem kya hai?")).toContain("Inventory")
    expect(generateChatTitle("Inventory ni problem su che?")).toContain("Inventory")
    expect(generateChatTitle("Meri website aur physical store stock same nahi hota.")).toContain("Website")
    expect(generateChatTitle("इन्वेंटरी समस्या क्या है?")).toContain("इन्वेंटरी")
    expect(generateChatTitle("ઇન્વેન્ટરીની સમસ્યા શું છે?")).toContain("ઇન્વેન્ટરી")
  })
})
