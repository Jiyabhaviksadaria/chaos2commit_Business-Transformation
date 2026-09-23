import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const logs = await db.activityLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      ok: true,
      logs
    })
  } catch (error) {
    console.error("Admin audit logs error:", error)
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
  }
}
