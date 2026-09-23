/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  _req: NextRequest,
  { params }: { params: { notificationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notification = await db.notification.findUnique({
      where: { id: params.notificationId }
    })

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await db.notification.update({
      where: { id: params.notificationId },
      data: { readAt: new Date() }
    })

    return NextResponse.json({
      ok: true,
      notification: updated
    })
  } catch (error: any) {
    console.error("[POST /api/notifications/[notificationId]/read] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to mark notification as read" }, { status: 500 })
  }
}
