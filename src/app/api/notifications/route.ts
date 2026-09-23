/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      db.notification.count({
        where: { userId, readAt: null }
      })
    ])

    return NextResponse.json({
      ok: true,
      notifications,
      unreadCount
    })
  } catch (error: any) {
    console.error("[GET /api/notifications] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch notifications" }, { status: 500 })
  }
}
