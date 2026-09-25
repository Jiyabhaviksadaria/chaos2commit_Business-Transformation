import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireConversationAccess } from "@/lib/team-chat/access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversation } = await requireConversationAccess(params.conversationId)

    const detailed = await db.teamConversation.findUnique({
      where: { id: conversation.id },
      include: {
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!detailed) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
    }

    return NextResponse.json({
      conversation: {
        id: detailed.id,
        workspaceId: detailed.workspaceId,
        projectId: detailed.projectId,
        projectName: detailed.project?.name || null,
        type: detailed.type,
        name: detailed.name,
        description: detailed.description,
        isPrivate: detailed.isPrivate,
        createdAt: detailed.createdAt.toISOString(),
        lastMessageAt: detailed.lastMessageAt?.toISOString() || null,
        members: detailed.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          companyRole: m.user.companyRole,
          department: m.user.department,
          role: m.role,
        })),
      },
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[GET /api/team-chat/conversations/:id] Error:", error)
    return NextResponse.json({ error: "Unable to load conversation." }, { status: 500 })
  }
}
