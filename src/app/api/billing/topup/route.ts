import { NextResponse } from "next/server"
import { requireUser } from "@/lib/access"
import { grantCredits } from "@/lib/billing/credits"

export async function POST() {
  try {
    const user = await requireUser()
    if (!user.organizationId) return NextResponse.json({ ok: false, error: "No org" }, { status: 400 })

    const result = await grantCredits({
      organizationId: user.organizationId,
      amount: 50,
      reason: "Demo top-up (manual)",
      grantedByUserId: user.id
    })

    return NextResponse.json({ ok: true, balanceAfter: result.balanceAfter })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 })
  }
}
