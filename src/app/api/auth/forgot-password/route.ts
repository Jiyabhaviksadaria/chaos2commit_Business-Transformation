import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { createRawToken, hashToken, normalizeEmail, PASSWORD_RESET_TOKEN_TTL_MS, tokenExpiry } from "@/lib/auth-tokens"
import { sendPasswordResetEmail } from "@/lib/mail/templates/password-reset"

const schema = z.object({ email: z.string().trim().email("Invalid email address").max(320) })

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 })
    const email = normalizeEmail(parsed.data.email)
    const user = await db.user.findUnique({ where: { email } })

    if (user?.emailVerified) {
      const rawToken = createRawToken()
      await db.$transaction(async (tx) => {
        await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })
        await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: tokenExpiry(PASSWORD_RESET_TOKEN_TTL_MS) } })
      })
      await sendPasswordResetEmail(user.name || "there", email, rawToken)
    }

    // Deliberately generic to avoid account enumeration.
    return NextResponse.json({ success: true, message: "If an account exists for that email, a password reset link has been sent." })
  } catch (error) {
    console.error("Forgot password request failed", error)
    return NextResponse.json({ error: "Unable to process the request." }, { status: 503 })
  }
}
