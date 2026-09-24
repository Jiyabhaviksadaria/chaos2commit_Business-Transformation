import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { createRawToken, EMAIL_VERIFICATION_TOKEN_TTL_MS, hashToken, normalizeEmail, tokenExpiry } from "@/lib/auth-tokens"
import { sendVerificationEmail } from "@/lib/mail/templates/verification"
import { DEMO_MODE_RESTRICTION_MESSAGE, isDemoIdentity } from "@/lib/demo-account"

const schema = z.object({ email: z.string().trim().email("Invalid email address").max(320) })

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ success: false, error: "Enter a valid email address." }, { status: 400 })
    const email = normalizeEmail(parsed.data.email)
    const user = await db.user.findUnique({ where: { email } })

    if (isDemoIdentity(user)) {
      return NextResponse.json({ error: DEMO_MODE_RESTRICTION_MESSAGE }, { status: 403 })
    }

    if (user && !user.emailVerified) {
      const rawToken = createRawToken()
      await db.$transaction(async (tx) => {
        await tx.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } })
        await tx.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt: tokenExpiry(EMAIL_VERIFICATION_TOKEN_TTL_MS) } })
      })
      await sendVerificationEmail(user.name || "there", email, rawToken)
    }

    // Deliberately generic to avoid account enumeration.
    return NextResponse.json({ success: true, message: "If an unverified account exists for that email, a new verification link has been sent." })
  } catch (error) {
    console.error("Resend verification failed", error)
    return NextResponse.json({ error: "Unable to process the request." }, { status: 503 })
  }
}
