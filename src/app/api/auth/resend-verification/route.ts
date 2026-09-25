import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  createRawToken,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  hashToken,
  normalizeEmail,
  tokenExpiry,
} from "@/lib/auth-tokens"
import { sendVerificationEmail } from "@/lib/mail/templates/verification"
import { DEMO_MODE_RESTRICTION_MESSAGE, isDemoIdentity } from "@/lib/demo-account"

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
})

const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds cooldown

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address." },
        { status: 400 }
      )
    }

    const email = normalizeEmail(parsed.data.email)
    const user = await db.user.findUnique({ where: { email } })

    if (isDemoIdentity(user)) {
      return NextResponse.json({ error: DEMO_MODE_RESTRICTION_MESSAGE }, { status: 403 })
    }

    // If user is already verified, let them know immediately
    if (user && user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Your email is already verified. Continue to sign in.",
      })
    }

    if (user && !user.emailVerified) {
      // Check cooldown from latest created token
      const latestToken = await db.emailVerificationToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      })

      if (latestToken) {
        const elapsed = Date.now() - new Date(latestToken.createdAt).getTime()
        if (elapsed < RESEND_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
          return NextResponse.json(
            {
              success: false,
              rateLimited: true,
              retryAfterSeconds: remainingSeconds,
              error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting another verification email.`,
            },
            { status: 429 }
          )
        }
      }

      // Generate fresh token and safely invalidate older unconsumed tokens
      const rawToken = createRawToken()
      await db.$transaction(async (tx) => {
        await tx.emailVerificationToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        })
        await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt: tokenExpiry(EMAIL_VERIFICATION_TOKEN_TTL_MS),
          },
        })
      })

      const sent = await sendVerificationEmail(user.name || "there", email, rawToken, req)
      if (!sent) {
        return NextResponse.json({
          success: true,
          emailSent: false,
          message: "Verification email queued. Note: Email service is operating in internal test mode.",
          cooldownSeconds: 60,
        })
      }
    }

    // Deliberately generic message to prevent account enumeration if user does not exist
    return NextResponse.json({
      success: true,
      message: "If an account exists with that email, a new verification link has been sent. Check your inbox and spam folder. Older links will no longer work.",
      cooldownSeconds: 60,
    })
  } catch (error) {
    console.error("[POST /api/auth/resend-verification] Error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      { error: "We couldn't send the verification email. Please try again in a moment." },
      { status: 503 }
    )
  }
}
