import { ChatRole, ChatSessionKind } from "@prisma/client"
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { chatMessageSchema, chatSessionIdSchema } from "@/lib/validation/chat"
import { chatStream } from "@/lib/ai/orchestrator"
import { DEFAULT_CHAT_TITLE, generateChatTitle } from "@/lib/ai/chat-title"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const chatSelect = {
  id: true,
  title: true,
  kind: true,
  createdAt: true,
  updatedAt: true,
} as const

const messageSelect = {
  id: true,
  role: true,
  content: true,
  createdAt: true,
} as const

const ORCHESTRATOR_FAILURE_MESSAGES = [
  "AI providers unavailable.",
  "Rate limit exceeded.",
] as const

type MessageRecord = {
  id: string
  role: ChatRole
  content: string
  createdAt: Date
}

type ChatWithMessages = {
  id: string
  title: string
  kind: ChatSessionKind
  createdAt: Date
  updatedAt: Date
  messages: MessageRecord[]
}

class ChatGenerationError extends Error {
  readonly rateLimited: boolean
  readonly aborted: boolean

  constructor(message: string, rateLimited = false, aborted = false) {
    super(message)
    this.name = "ChatGenerationError"
    this.rateLimited = rateLimited
    this.aborted = aborted
  }
}

type StreamGenerationInput = {
  session: ChatWithMessages
  userId: string
  userMessage: MessageRecord
  providerMessages: { role: string; content: string }[]
  request: Request
  requestId?: string
}

function serializeMessage(message: MessageRecord) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }
}

function providerRole(role: ChatRole): string {
  if (role === ChatRole.ASSISTANT) return "assistant"
  if (role === ChatRole.SYSTEM) return "system"
  return "user"
}

function authenticationError() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 })
}

function serverError(operation: string) {
  return NextResponse.json({ error: `Unable to ${operation}.` }, { status: 500 })
}

function invalidSessionError() {
  return NextResponse.json({ error: "Invalid chat session id." }, { status: 400 })
}

function notFoundError() {
  return NextResponse.json({ error: "Chat not found." }, { status: 404 })
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "ChatGenerationError" && error.message === "aborted")
}

function requestIdFrom(request: Request): string | undefined {
  const value = request.headers.get("x-chat-request-id")?.trim()
  return value ? value.slice(0, 128) : undefined
}

async function touchOwnedChat(sessionId: string, userId: string, title?: string) {
  return db.chatSession.update({
    where: {
      id: sessionId,
      userId,
      kind: ChatSessionKind.CONSULTANT,
      projectId: null,
    },
    data: {
      ...(title ? { title } : {}),
      // ChatMessage writes do not automatically touch the parent session.
      updatedAt: new Date(),
    },
    select: chatSelect,
  })
}

async function collectAssistantResponse(
  messages: { role: string; content: string }[],
  userId: string,
  signal?: AbortSignal,
) {
  let content = ""

  try {
    for await (const chunk of chatStream({
      messages,
      userId,
      ...(signal ? { signal } : {}),
    })) {
      if (typeof chunk === "string") content += chunk
    }
  } catch (error: unknown) {
    if (signal?.aborted) throw new ChatGenerationError("aborted", false, true)
    throw new ChatGenerationError(error instanceof Error ? error.name : "Provider failure")
  }

  content = content.trim()
  if (!content) throw new ChatGenerationError("Empty provider response")
  if (ORCHESTRATOR_FAILURE_MESSAGES.some((failureMessage) => content.includes(failureMessage))) {
    throw new ChatGenerationError(
      "Orchestrator failure",
      content.includes("Rate limit exceeded."),
    )
  }

  return content
}

function sseFrame(type: string, payload: Record<string, unknown>): string {
  return `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`
}

function createStreamingResponse(input: StreamGenerationInput): Response {
  const { request, requestId, session, userId, userMessage, providerMessages } = input
  const encoder = new TextEncoder()
  const abortController = new AbortController()
  const onRequestAbort = () => abortController.abort()
  request.signal.addEventListener("abort", onRequestAbort, { once: true })
  if (request.signal.aborted) abortController.abort()

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let closed = false

      const send = (type: string, payload: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(sseFrame(type, { ...(requestId ? { requestId } : {}), ...payload })))
        } catch {
          closed = true
          abortController.abort()
          throw new Error("stream closed")
        }
      }

      try {
        if (abortController.signal.aborted) throw new ChatGenerationError("aborted", false, true)

        send("user", { userMessage: serializeMessage(userMessage) })

        let content = ""
        for await (const chunk of chatStream({
          messages: providerMessages,
          userId,
          signal: abortController.signal,
        })) {
          if (abortController.signal.aborted) throw new ChatGenerationError("aborted", false, true)
          if (typeof chunk !== "string" || chunk.length === 0) continue
          if (ORCHESTRATOR_FAILURE_MESSAGES.some((failureMessage) => chunk.includes(failureMessage))) {
            throw new ChatGenerationError(
              "Orchestrator failure",
              chunk.includes("Rate limit exceeded."),
            )
          }
          content += chunk
          send("chunk", { text: chunk })
        }

        if (abortController.signal.aborted) throw new ChatGenerationError("aborted", false, true)
        content = content.trim()
        if (!content) throw new ChatGenerationError("Empty provider response")
        if (abortController.signal.aborted) throw new ChatGenerationError("aborted", false, true)

        const assistantMessage = await db.chatMessage.create({
          data: {
            sessionId: session.id,
            role: ChatRole.ASSISTANT,
            content,
          },
          select: messageSelect,
        })
        let updatedAt = session.updatedAt
        try {
          const updatedSession = await touchOwnedChat(session.id, userId)
          updatedAt = updatedSession.updatedAt
        } catch (error: unknown) {
          // The assistant message is already durable. A sidebar timestamp
          // failure must not turn a successful generation into a retryable error.
          console.error(
            "[POST /api/ai/chats/:sessionId/messages] final chat touch failed:",
            error instanceof Error ? error.name : "UnknownError",
          )
        }

        send("done", {
          chatId: session.id,
          messageId: assistantMessage.id,
          updatedAt: updatedAt.toISOString(),
          assistantMessage: serializeMessage(assistantMessage),
        })
      } catch (error: unknown) {
        if (closed) {
          // The consumer already disconnected.
        } else if (abortController.signal.aborted) {
          // Do not enqueue a cancellation event after the request signal has
          // already disconnected; the client has its own AbortError path.
          closed = true
        } else if (isAbortError(error)) {
          send("cancelled", {})
        } else {
          const rateLimited = error instanceof ChatGenerationError && error.rateLimited
          send("error", {
            code: rateLimited ? "RATE_LIMITED" : "GENERATION_FAILED",
            message: rateLimited
              ? "Too many requests. Please try again shortly."
              : "Generation failed. Retry.",
          })
        }
        if (!abortController.signal.aborted && !isAbortError(error)) {
          console.error(
            "[POST /api/ai/chats/:sessionId/messages] stream generation failed:",
            error instanceof Error ? error.name : "UnknownError",
          )
        }
      } finally {
        request.signal.removeEventListener("abort", onRequestAbort)
        try {
          controller.close()
        } catch {
          // The client may have disconnected while the provider was running.
        }
      }
    },
    cancel: () => {
      abortController.abort()
      request.signal.removeEventListener("abort", onRequestAbort)
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

export async function POST(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser()
    const parsedSessionId = chatSessionIdSchema.safeParse(params.sessionId)
    if (!parsedSessionId.success) return invalidSessionError()

    const body = await req.json().catch(() => null)
    const parsedBody = chatMessageSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid message content." }, { status: 400 })
    }

    const sessionId = parsedSessionId.data
    const content = parsedBody.data.content
    const retryMessageId = parsedBody.data.retryMessageId
    const session = await db.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
      },
      select: {
        ...chatSelect,
        messages: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: messageSelect,
        },
      },
    }) as ChatWithMessages | null

    if (!session) return notFoundError()

    let userMessage: MessageRecord
    let historyMessages = session.messages
    let generatedTitle: string | undefined

    if (retryMessageId) {
      const lastUserMessage = [...session.messages].reverse().find((message) => message.role === ChatRole.USER)
      if (!lastUserMessage || lastUserMessage.id !== retryMessageId) {
        return NextResponse.json({ error: "Retry message is no longer available." }, { status: 400 })
      }
      if (lastUserMessage.content !== content) {
        return NextResponse.json({ error: "Retry content must match the saved user message." }, { status: 400 })
      }
      userMessage = lastUserMessage
      historyMessages = session.messages.slice(0, session.messages.indexOf(lastUserMessage))
    } else {
      const hasExistingUserMessage = session.messages.some((message) => message.role === ChatRole.USER)
      generatedTitle =
        !hasExistingUserMessage && session.title === DEFAULT_CHAT_TITLE
          ? generateChatTitle(content)
          : undefined

      userMessage = await db.chatMessage.create({
        data: {
          sessionId: session.id,
          role: ChatRole.USER,
          content,
        },
        select: messageSelect,
      })
    }

    // Touch the parent after the user message and apply the deterministic title
    // before generation. If generation fails, the user message remains durable.
    await touchOwnedChat(
      session.id,
      user.id,
      generatedTitle && generatedTitle !== DEFAULT_CHAT_TITLE ? generatedTitle : undefined,
    )

    const providerMessages = [
      ...historyMessages.map((message) => ({
        role: providerRole(message.role),
        content: message.content,
      })),
      { role: "user", content: userMessage.content },
    ]

    const accept = req.headers.get("accept") ?? ""
    if (accept.toLowerCase().includes("text/event-stream")) {
      return createStreamingResponse({
        session,
        userId: user.id,
        userMessage,
        providerMessages,
        request: req,
        requestId: requestIdFrom(req),
      })
    }

    let assistantContent: string
    try {
      // Keep the legacy JSON response for existing clients and Phase 1 tests.
      assistantContent = await collectAssistantResponse(providerMessages, user.id)
    } catch (error: unknown) {
      if (error instanceof ChatGenerationError && error.rateLimited) {
        return NextResponse.json(
          { error: "AI request limit exceeded. Your message was saved; please try again later." },
          { status: 429 },
        )
      }

      console.error(
        "[POST /api/ai/chats/:sessionId/messages] AI generation failed:",
        error instanceof Error ? error.name : "UnknownError",
      )
      return NextResponse.json(
        { error: "AI generation failed. Your message was saved; please try again." },
        { status: 500 },
      )
    }

    const assistantMessage = await db.chatMessage.create({
      data: {
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content: assistantContent,
      },
      select: messageSelect,
    })

    // Persisting the assistant message is the point at which the complete
    // response becomes available to the next request. Touch once more so the
    // sidebar can order by the most recent completed activity.
    await touchOwnedChat(session.id, user.id)

    return NextResponse.json({
      userMessage: serializeMessage(userMessage),
      assistantMessage: serializeMessage(assistantMessage),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error(
      "[POST /api/ai/chats/:sessionId/messages] Failed to send message:",
      error instanceof Error ? error.name : "UnknownError",
    )
    return serverError("send the message")
  }
}
