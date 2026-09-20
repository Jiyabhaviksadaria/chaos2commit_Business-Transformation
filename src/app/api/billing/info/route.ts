import { NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const user = await requireUser()
    if (!user.organizationId) return NextResponse.json({ ok: false, error: "No org" }, { status: 400 })

    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { creditBalance: true, plan: true, name: true }
    })

    const transactions = await db.creditTransaction.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 50
    })

    return NextResponse.json({ ok: true, org, transactions })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
