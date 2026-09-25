import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireUser, AccessError } from "@/lib/access"
import { editMessageSchema } from "@/lib/validation/team-chat"
import { broadcastTeamChatEvent } from "@/lib/team-chat/events"
import { PlatformRole, OrgRole } from "@prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await requireUser()

    const message = await db.teamMessage.findUnique({
      where: { id: params.messageId },
      include: {
        conversation: true,
      },
    })

    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    if (message.senderId !== user.id) {
      throw new AccessError("You can only edit your own messages.")
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = editMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid message content." },
        { status: 400 }
      )
    }

    const updated = await db.teamMessage.update({
      where: { id: message.id },
      data: {
        content: parsed.data.content.trim(),
        editedAt: new Date(),
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

    const serialized = {
      id: updated.id,
      conversationId: updated.conversationId,
      senderId: updated.senderId,
      sender: updated.sender,
      content: updated.content,
      editedAt: updated.editedAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      reactions: updated.reactions,
    }

    broadcastTeamChatEvent({
      type: "message:edit",
      workspaceId: message.conversation.workspaceId,
      conversationId: message.conversationId,
      payload: { message: serialized },
    })

    return NextResponse.json({ message: serialized })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[PATCH /api/team-chat/messages/:id] Error:", error)
    return NextResponse.json({ error: "Unable to edit message." }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await requireUser()

    const message = await db.teamMessage.findUnique({
      where: { id: params.messageId },
      include: {
        conversation: {
          include: {
            workspace: {
              include: {
                organization: {
                  include: {
                    memberships: {
                      where: { userId: user.id },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!message || message.deletedAt) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    const isAuthor = message.senderId === user.id
    const isPlatformAdmin = user.role === PlatformRole.PLATFORM_ADMIN
    const orgMembership = message.conversation.workspace.organization.memberships[0]
    const isOrgAdmin = orgMembership?.role === OrgRole.OWNER || orgMembership?.role === OrgRole.ADMIN

    if (!isAuthor && !isPlatformAdmin && !isOrgAdmin) {
      throw new AccessError("You do not have permission to delete this message.")
    }

    await db.teamMessage.update({
      where: { id: message.id },
      data: { deletedAt: new Date() },
    })

    broadcastTeamChatEvent({
      type: "message:delete",
      workspaceId: message.conversation.workspaceId,
      conversationId: message.conversationId,
      payload: { messageId: message.id, conversationId: message.conversationId },
    })

    return NextResponse.json({ success: true, messageId: message.id })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[DELETE /api/team-chat/messages/:id] Error:", error)
    return NextResponse.json({ error: "Unable to delete message." }, { status: 500 })
  }
}
