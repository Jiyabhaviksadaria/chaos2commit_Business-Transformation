import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const users = await db.user.findMany({
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        memberships: {
          include: {
            organization: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      ok: true,
      users
    })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
