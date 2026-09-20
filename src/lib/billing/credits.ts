import { db } from "@/lib/db"
import { Result, ok, fail } from "@/lib/result"

type DeductOpts = {
  organizationId: string
  userId?: string
  amount: number
  reason: string
  refType?: string
  refId?: string
}

/**
 * Atomically deducts credits using a transaction.
 * Uses updateMany with where creditBalance >= amount to prevent negative balances.
 * Returns the new balance or an error if insufficient credits.
 * Idempotent by refId (if refId provided and already used, returns ok).
 */
export async function deductCredits(opts: DeductOpts): Promise<Result<{ balanceAfter: number }, { code: string; message: string }>> {
  // Idempotency check
  if (opts.refId) {
    const existing = await db.creditTransaction.findFirst({
      where: { organizationId: opts.organizationId, refId: opts.refId, amount: -opts.amount }
    })
    if (existing) {
      return ok({ balanceAfter: existing.balanceAfter })
    }
  }

  return db.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: opts.organizationId },
      select: { creditBalance: true }
    })
    if (!org) return fail({ code: "ORG_NOT_FOUND", message: "Organization not found" })
    if (org.creditBalance < opts.amount) {
      return fail({ code: "INSUFFICIENT_CREDITS", message: `Insufficient credits. Need ${opts.amount}, have ${org.creditBalance}.` })
    }

    const updated = await tx.organization.update({
      where: { id: opts.organizationId, creditBalance: { gte: opts.amount } },
      data: { creditBalance: { decrement: opts.amount } },
      select: { creditBalance: true }
    })

    await tx.creditTransaction.create({
      data: {
        organizationId: opts.organizationId,
        userId: opts.userId,
        amount: -opts.amount,
        reason: opts.reason,
        refType: opts.refType,
        refId: opts.refId,
        balanceAfter: updated.creditBalance
      }
    })

    return ok({ balanceAfter: updated.creditBalance })
  })
}

/** Refunds credits (e.g. after AI failure). Uses a reversing transaction. */
export async function refundCredits(opts: DeductOpts & { originalRefId: string }): Promise<void> {
  await db.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: opts.organizationId },
      data: { creditBalance: { increment: opts.amount } },
      select: { creditBalance: true }
    })
    await tx.creditTransaction.create({
      data: {
        organizationId: opts.organizationId,
        userId: opts.userId,
        amount: opts.amount,
        reason: `REFUND: ${opts.reason}`,
        refType: opts.refType,
        refId: `refund_${opts.originalRefId}`,
        balanceAfter: updated.creditBalance
      }
    })
  })
}

/** Grants credits to an org (admin action). */
export async function grantCredits(opts: {
  organizationId: string
  amount: number
  reason: string
  grantedByUserId: string
}): Promise<{ balanceAfter: number }> {
  const updated = await db.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: opts.organizationId },
      data: { creditBalance: { increment: opts.amount } },
      select: { creditBalance: true }
    })
    await tx.creditTransaction.create({
      data: {
        organizationId: opts.organizationId,
        userId: opts.grantedByUserId,
        amount: opts.amount,
        reason: opts.reason,
        refType: "GRANT",
        balanceAfter: org.creditBalance
      }
    })
    return org
  })
  return { balanceAfter: updated.creditBalance }
}
