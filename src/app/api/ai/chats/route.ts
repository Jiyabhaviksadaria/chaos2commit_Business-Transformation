import { ChatSessionKind } from "@prisma/client"
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"
import { createChatSchema } from "@/lib/validation/chat"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const chatSelect = {
  id: true,
  title: true,
  kind: true,
  createdAt: true,
  updatedAt: true,
} as const

type ChatRecord = {
  id: string
  title: string
  kind: ChatSessionKind
  createdAt: Date
  updatedAt: Date
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

function authenticationError() {
  return NextResponse.json({ error: "Authentication required." }, { status: 401 })
}

function serverError(operation: string) {
  return NextResponse.json({ error: `Unable to ${operation}.` }, { status: 500 })
}

export async function GET() {
  try {
    const user = await requireUser()
    const chats = await db.chatSession.findMany({
      where: {
        // Keep the global assistant namespace separate from project-backed chats.
        userId: user.id,
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({
      chats: chats.map((chat) => ({
        ...serializeChat(chat),
        messageCount: chat._count.messages,
      })),
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error("[GET /api/ai/chats] Failed to list chats:", error instanceof Error ? error.name : "UnknownError")
    return serverError("load chats")
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    let body: unknown = {}

    try {
      const rawBody = await req.text()
      if (rawBody.trim().length > 0) body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const parsed = createChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat title." }, { status: 400 })
    }

    const chat = await db.chatSession.create({
      data: {
        title: parsed.data.title,
        userId: user.id,
        kind: ChatSessionKind.CONSULTANT,
        projectId: null,
      },
      select: chatSelect,
    })

    return NextResponse.json({ chat: serializeChat(chat) }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") return authenticationError()
    console.error("[POST /api/ai/chats] Failed to create chat:", error instanceof Error ? error.name : "UnknownError")
    return serverError("create the chat")
  }
}
