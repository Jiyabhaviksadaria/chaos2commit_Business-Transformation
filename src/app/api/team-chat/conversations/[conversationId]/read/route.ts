import { NextResponse } from "next/server"
import { requireConversationAccess, markConversationRead } from "@/lib/team-chat/access"
import { broadcastTeamChatEvent } from "@/lib/team-chat/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversation, user } = await requireConversationAccess(params.conversationId)

    await markConversationRead(conversation.id, user.id)

    broadcastTeamChatEvent({
      type: "conversation:read",
      workspaceId: conversation.workspaceId,
      conversationId: conversation.id,
      targetUserIds: [user.id],
      payload: { conversationId: conversation.id, userId: user.id },
    })

    return NextResponse.json({ success: true, conversationId: conversation.id })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthError") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }
    if (error instanceof Error && error.name === "AccessError") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    console.error("[POST /api/team-chat/conversations/:id/read] Error:", error)
    return NextResponse.json({ error: "Unable to update read state." }, { status: 500 })
  }
}
