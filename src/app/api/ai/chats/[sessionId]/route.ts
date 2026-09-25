import { ChatRole, ChatSessionKind } from "@prisma/client"
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { chatSessionIdSchema, renameChatSchema } from "@/lib/validation/chat"

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

type ChatRecord = {
  id: string
  title: string
  kind: ChatSessionKind
  createdAt: Date
  updatedAt: Date
}

type MessageRecord = {
  id: string
  role: ChatRole
  content: string
  createdAt: Date
}

function serializeChat(chat: ChatRecord) {
  return {
    id: chat.id,
    title: chat.title,
    kind: chat.kind,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }
}

function serializeMessage(message: MessageRecord) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
  }
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

async function findOwnedGlobalChat(sessionId: string, userId: string) {
  return db.chatSession.findFirst({
    where: {
      // Project-backed sessions remain owned by the project AI flows.
      id: sessionId,
      userId,
      kind: ChatSessionKind.CONSULTANT,
      projectId: null,
    },
    select: chatSelect,
  })
}

export async function GET(_req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser()
    const parsedSessionId = chatSessionIdSchema.safeParse(params.sessionId)
    if (!parsedSessionId.success) return invalidSessionError()

    const chat = await db.chatSession.findFirst({
      where: {
        id: parsedSessionId.data,
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
    })

    if (!chat) return notFoundError()

    return NextResponse.json({
      chat: serializeChat(chat),
      messages: chat.messages.map(serializeMessage),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error("[GET /api/ai/chats/:sessionId] Failed to load chat:", error instanceof Error ? error.name : "UnknownError")
    return serverError("load the chat")
  }
}

export async function PATCH(req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser()
    const parsedSessionId = chatSessionIdSchema.safeParse(params.sessionId)
    if (!parsedSessionId.success) return invalidSessionError()

    const body = await req.json().catch(() => null)
    const parsedBody = renameChatSchema.safeParse(body)
    if (!parsedBody.success) {
      return NextResponse.json({ error: "A non-empty chat title is required." }, { status: 400 })
    }

    const ownedChat = await findOwnedGlobalChat(parsedSessionId.data, user.id)
    if (!ownedChat) return notFoundError()

    const chat = await db.chatSession.update({
      where: {
        id: ownedChat.id,
        userId: user.id,
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
      },
      data: { title: parsedBody.data.title },
      select: chatSelect,
    })

    return NextResponse.json({ chat: serializeChat(chat) })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error("[PATCH /api/ai/chats/:sessionId] Failed to rename chat:", error instanceof Error ? error.name : "UnknownError")
    return serverError("rename the chat")
  }
}

export async function DELETE(_req: Request, { params }: { params: { sessionId: string } }) {
  try {
    const user = await requireUser()
    const parsedSessionId = chatSessionIdSchema.safeParse(params.sessionId)
    if (!parsedSessionId.success) return invalidSessionError()

    const result = await db.chatSession.deleteMany({
      where: {
        id: parsedSessionId.data,
        userId: user.id,
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
      },
    })

    if (result.count === 0) return notFoundError()
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error("[DELETE /api/ai/chats/:sessionId] Failed to delete chat:", error instanceof Error ? error.name : "UnknownError")
    return serverError("delete the chat")
  }
}
