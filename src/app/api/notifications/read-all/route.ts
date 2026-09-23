/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const result = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() }
    })

    return NextResponse.json({
      ok: true,
      updatedCount: result.count
    })
  } catch (error: any) {
    console.error("[POST /api/notifications/read-all] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to mark all notifications as read" }, { status: 500 })
  }
}
