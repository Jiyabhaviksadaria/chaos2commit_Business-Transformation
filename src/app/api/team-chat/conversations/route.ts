import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveUserWorkspace } from "@/lib/team-chat/access"
import { createConversationSchema } from "@/lib/validation/team-chat"
import { TeamConversationType, TeamMemberRole } from "@prisma/client"
import { broadcastTeamChatEvent } from "@/lib/team-chat/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedWorkspaceId = searchParams.get("workspaceId")

    const { workspace, user } = await resolveUserWorkspace(requestedWorkspaceId)

    // Fetch all public channels OR conversations where user is a member
    const conversations = await db.teamConversation.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          {
            type: TeamConversationType.CHANNEL,
            isPrivate: false,
          },
          {
            members: {
              some: { userId: user.id },
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                companyRole: true,
                department: true,
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { lastMessageAt: "desc" },
        { createdAt: "asc" },
      ],
    })

    // Compute unread counts for each conversation
    const serialized = await Promise.all(
      conversations.map(async (conv) => {
        const userMembership = conv.members.find((m) => m.userId === user.id)
        const lastReadAt = userMembership?.lastReadAt ?? new Date(0)

        const unreadCount = await db.teamMessage.count({
          where: {
            conversationId: conv.id,
            deletedAt: null,
            createdAt: { gt: lastReadAt },
            senderId: { not: user.id },
          },
        })

        const lastMessage = conv.messages[0]
          ? {
              id: conv.messages[0].id,
              content: conv.messages[0].content,
              createdAt: conv.messages[0].createdAt.toISOString(),
              senderName: conv.messages[0].sender?.name || "Unknown",
            }
          : null

        return {
          id: conv.id,
          workspaceId: conv.workspaceId,
          projectId: conv.projectId,
          projectName: conv.project?.name || null,
          type: conv.type,
          name: conv.name,
          description: conv.description,
          isPrivate: conv.isPrivate,
          lastMessageAt: conv.lastMessageAt?.toISOString() || null,
          unreadCount,
          lastMessage,
          members: conv.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            companyRole: m.user.companyRole,
            department: m.user.department,
            role: m.role,
          })),
        }
      })
    )

    return NextResponse.json({ conversations: serialized })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/team-chat/conversations] Error:", error)
    return NextResponse.json({ error: "Unable to load conversations." }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedWorkspaceId = searchParams.get("workspaceId")

    const { workspace, user } = await resolveUserWorkspace(requestedWorkspaceId)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
    }

    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid conversation payload." },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.type === "CHANNEL") {
      const channelName = data.name.trim().toLowerCase()

      // Check if channel already exists in this workspace
      const existing = await db.teamConversation.findFirst({
        where: {
          workspaceId: workspace.id,
          type: TeamConversationType.CHANNEL,
          name: channelName,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: `A channel named #${channelName} already exists in this workspace.` },
          { status: 409 }
        )
      }

      if (data.projectId) {
        const linkedProject = await db.project.findFirst({
          where: { id: data.projectId, workspaceId: workspace.id },
        })
        if (!linkedProject) {
          return NextResponse.json(
            { error: "Project not found or does not belong to this workspace." },
            { status: 400 }
          )
        }
      }

      const conversation = await db.teamConversation.create({
        data: {
          workspaceId: workspace.id,
          projectId: data.projectId || null,
          type: TeamConversationType.CHANNEL,
          name: channelName,
          description: data.description?.trim() || null,
          isPrivate: data.isPrivate ?? false,
          createdById: user.id,
          members: {
            create: {
              userId: user.id,
              role: TeamMemberRole.ADMIN,
              lastReadAt: new Date(),
            },
          },
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, companyRole: true, department: true },
              },
            },
          },
        },
      })

      const serializedConversation = {
        ...conversation,
        projectName: conversation.project?.name || null,
      }

      broadcastTeamChatEvent({
        type: "conversation:new",
        workspaceId: workspace.id,
        conversationId: conversation.id,
        payload: { conversation: serializedConversation },
      })

      return NextResponse.json({ conversation: serializedConversation }, { status: 201 })
    }

    if (data.type === "DIRECT_MESSAGE") {
      const recipientId = data.recipientUserId

      if (recipientId === user.id) {
        return NextResponse.json({ error: "Cannot start a direct message with yourself." }, { status: 400 })
      }

      // Verify recipient exists and belongs to the workspace's organization
      const recipientMembership = await db.membership.findFirst({
        where: {
          userId: recipientId,
          organizationId: workspace.organizationId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, companyRole: true, department: true },
          },
        },
      })

      if (!recipientMembership) {
        return NextResponse.json({ error: "Recipient is not a member of this workspace." }, { status: 404 })
      }

      // Check if 1:1 DM conversation already exists between these two users in this workspace
      const existingDMs = await db.teamConversation.findMany({
        where: {
          workspaceId: workspace.id,
          type: TeamConversationType.DIRECT_MESSAGE,
          members: {
            some: { userId: user.id },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, companyRole: true, department: true },
              },
            },
          },
        },
      })

      const existingDM = existingDMs.find(
        (c) => c.members.length === 2 && c.members.some((m) => m.userId === recipientId)
      )

      if (existingDM) {
        return NextResponse.json({ conversation: existingDM }, { status: 200 })
      }

      // Create new DM
      const conversation = await db.teamConversation.create({
        data: {
          workspaceId: workspace.id,
          type: TeamConversationType.DIRECT_MESSAGE,
          isPrivate: true,
          createdById: user.id,
          members: {
            create: [
              { userId: user.id, role: TeamMemberRole.ADMIN, lastReadAt: new Date() },
              { userId: recipientId, role: TeamMemberRole.MEMBER, lastReadAt: new Date(0) },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, companyRole: true, department: true },
              },
            },
          },
        },
      })

      broadcastTeamChatEvent({
        type: "conversation:new",
        workspaceId: workspace.id,
        conversationId: conversation.id,
        targetUserIds: [user.id, recipientId],
        payload: { conversation },
      })

      return NextResponse.json({ conversation }, { status: 201 })
    }

    if (data.type === "GROUP") {
      const uniqueMemberIds = Array.from(new Set([user.id, ...data.memberUserIds]))

      // Verify all members belong to workspace organization
      const memberships = await db.membership.findMany({
        where: {
          organizationId: workspace.organizationId,
          userId: { in: uniqueMemberIds },
        },
      })

      if (memberships.length !== uniqueMemberIds.length) {
        return NextResponse.json({ error: "One or more group members do not belong to this workspace." }, { status: 400 })
      }

      const conversation = await db.teamConversation.create({
        data: {
          workspaceId: workspace.id,
          type: TeamConversationType.GROUP,
          name: data.name?.trim() || null,
          isPrivate: true,
          createdById: user.id,
          members: {
            create: uniqueMemberIds.map((uid) => ({
              userId: uid,
              role: uid === user.id ? TeamMemberRole.ADMIN : TeamMemberRole.MEMBER,
              lastReadAt: uid === user.id ? new Date() : new Date(0),
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true, companyRole: true, department: true },
              },
            },
          },
        },
      })

      broadcastTeamChatEvent({
        type: "conversation:new",
        workspaceId: workspace.id,
        conversationId: conversation.id,
        targetUserIds: uniqueMemberIds,
        payload: { conversation },
      })

      return NextResponse.json({ conversation }, { status: 201 })
    }

    return NextResponse.json({ error: "Unsupported conversation type." }, { status: 400 })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/team-chat/conversations] Error:", error)
    return NextResponse.json({ error: "Unable to create conversation." }, { status: 500 })
  }
}
