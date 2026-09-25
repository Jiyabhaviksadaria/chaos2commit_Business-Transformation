import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireConversationAccess, markConversationRead } from "@/lib/team-chat/access"
import { createMessageSchema } from "@/lib/validation/team-chat"
import { broadcastTeamChatEvent } from "@/lib/team-chat/events"
import { TeamConversationType } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversation } = await requireConversationAccess(params.conversationId)
    const { searchParams } = new URL(req.url)

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100)
    const before = searchParams.get("before")

    let beforeDate: Date | undefined
    if (before) {
      // If before is an ID or ISO string
      const parsedDate = new Date(before)
      if (!isNaN(parsedDate.getTime())) {
        beforeDate = parsedDate
      } else {
        const refMessage = await db.teamMessage.findUnique({
          where: { id: before },
          select: { createdAt: true },
        })
        if (refMessage) {
          beforeDate = refMessage.createdAt
        }
      }
    }

    const messages = await db.teamMessage.findMany({
      where: {
        conversationId: conversation.id,
        deletedAt: null,
        ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            companyRole: true,
            department: true,
          },
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    })

    const hasMore = messages.length > limit
    const returned = hasMore ? messages.slice(0, limit) : messages

    // Return in chronological order
    const chronological = returned.reverse().map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      sender: msg.sender,
      content: msg.content,
      editedAt: msg.editedAt?.toISOString() || null,
      createdAt: msg.createdAt.toISOString(),
      reactions: msg.reactions.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.userId,
        userName: r.user.name,
      })),
    }))

    return NextResponse.json({
      messages: chronological,
      hasMore,
      nextCursor: hasMore && chronological.length > 0 ? chronological[0].createdAt : null,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/team-chat/conversations/:id/messages] Error:", error)
    return NextResponse.json({ error: "Unable to load messages." }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversation, user } = await requireConversationAccess(params.conversationId)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = createMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid message content." },
        { status: 400 }
      )
    }

    const content = parsed.data.content.trim()

    const now = new Date()

    // Create the message
    const message = await db.teamMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        content,
        createdAt: now,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            companyRole: true,
            department: true,
          },
        },
        reactions: true,
      },
    })

    // Update conversation lastMessageAt
    await db.teamConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: now },
    })

    // Mark as read for the sender
    await markConversationRead(conversation.id, user.id)

    // Determine target users if private
    let targetUserIds: string[] | undefined
    if (conversation.isPrivate || conversation.type !== TeamConversationType.CHANNEL) {
      const members = await db.teamConversationMember.findMany({
        where: { conversationId: conversation.id },
        select: { userId: true },
      })
      targetUserIds = members.map((m) => m.userId)
    }

    // Format for response and event
    const serializedMessage = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: message.sender,
      content: message.content,
      editedAt: null,
      createdAt: message.createdAt.toISOString(),
      reactions: [],
    }

    // Broadcast real-time event to SSE listeners
    broadcastTeamChatEvent({
      type: "message:new",
      workspaceId: conversation.workspaceId,
      conversationId: conversation.id,
      targetUserIds,
      payload: { message: serializedMessage },
    })

    return NextResponse.json({ message: serializedMessage }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/team-chat/conversations/:id/messages] Error:", error)
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 })
  }
}
