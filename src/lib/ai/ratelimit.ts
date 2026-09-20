import { Result, fail, ok } from "@/lib/result"

const TEN_MINUTES_MS = 10 * 60 * 1000
const MAX_CALLS = 20

// Singleton map retaining tracking bounds in memory
const limits = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(userId: string): Result<boolean, { code: string; message: string }> {
  const now = Date.now()
  const record = limits.get(userId)

  if (!record || now > record.resetAt) {
    // expired or missing, set bounds properly
    limits.set(userId, { count: 1, resetAt: now + TEN_MINUTES_MS })
    return ok(true)
  }

  if (record.count >= MAX_CALLS) {
    return fail({ code: "RATE_LIMITED", message: "Exceeded AI request limit of 20 per 10 minutes." })
  }

  record.count += 1
  return ok(true)
}
