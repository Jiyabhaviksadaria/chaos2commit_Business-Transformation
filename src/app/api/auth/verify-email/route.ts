import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashToken } from "@/lib/auth-tokens"

/**
 * GET /api/auth/verify-email?token=...
 *
 * Safe, idempotent token inspection.
 * This endpoint checks the validity of a verification token WITHOUT consuming it.
 * This protects against link prefetchers, mail safety scanners, and web crawlers
 * that issue GET requests to email links and would otherwise prematurely burn single-use tokens.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")
    if (!token || typeof token !== "string" || token.length < 32 || token.length > 256) {
      return NextResponse.json(
        {
          valid: false,
          reason: "INVALID_FORMAT",
          message: "This verification link is invalid or incomplete.",
        },
        { status: 400 }
      )
    }

    const tokenHash = hashToken(token)
    const record = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record) {
      return NextResponse.json(
        {
          valid: false,
          reason: "NOT_FOUND",
          message: "This verification link is invalid or has expired.",
        },
        { status: 400 }
      )
    }

    // If the token was already consumed
    if (record.usedAt) {
      return NextResponse.json(
        {
          valid: false,
          alreadyVerified: true,
          reason: "ALREADY_VERIFIED",
          email: record.user.email,
          message: "Your email address is already verified.",
        },
        { status: 200 }
      )
    }

    // If the token has expired
    if (record.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          valid: false,
          reason: "EXPIRED",
          email: record.user.email,
          message: "This verification link has expired.",
        },
        { status: 400 }
      )
    }

    // If the user is already verified (e.g., verified via another link)
    if (record.user.emailVerified) {
      return NextResponse.json(
        {
          valid: false,
          alreadyVerified: true,
          reason: "ALREADY_VERIFIED",
          email: record.user.email,
          message: "Your email address is already verified.",
        },
        { status: 200 }
      )
    }

    // Valid pending token ready for confirmation
    return NextResponse.json({
      valid: true,
      email: record.user.email,
      name: record.user.name,
      message: "Ready to confirm email verification.",
    })
  } catch (error) {
    console.error("[GET /api/auth/verify-email] Inspection failed:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      { valid: false, error: "Unable to inspect verification token." },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/verify-email
 *
 * Atomic verification action triggered by explicit human interaction.
 * Consumes the token, marks user.emailVerified, and invalidates older pending tokens.
 * Handles race conditions and duplicate calls cleanly (returns alreadyVerified: true).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: unknown }
    const urlToken = request.nextUrl.searchParams.get("token")
    const token =
      typeof body?.token === "string" && body.token
        ? body.token
        : typeof urlToken === "string" && urlToken
        ? urlToken
        : ""

    if (!token || token.length < 32 || token.length > 256) {
      return NextResponse.json(
        {
          success: false,
          reason: "INVALID_FORMAT",
          error: "This verification link is invalid or incomplete.",
        },
        { status: 400 }
      )
    }

    const tokenHash = hashToken(token)
    const record = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          reason: "NOT_FOUND",
          error: "This verification link is invalid or has expired.",
        },
        { status: 400 }
      )
    }

    // If already used, check if the user is already verified (graceful idempotency)
    if (record.usedAt) {
      if (record.user.emailVerified) {
        return NextResponse.json({
          success: true,
          alreadyVerified: true,
          email: record.user.email,
          message: "Your email is already verified. You can continue to sign in.",
        })
      }

      return NextResponse.json(
        {
          success: false,
          reason: "ALREADY_USED",
          error: "This verification link has already been used. If your email is already verified, continue to sign in.",
        },
        { status: 400 }
      )
    }

    // Check expiration
    if (record.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          reason: "EXPIRED",
          email: record.user.email,
          error: "This verification link has expired. Please request a new verification email.",
        },
        { status: 400 }
      )
    }

    // If user is already verified through another action
    if (record.user.emailVerified) {
      const now = new Date()
      await db.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: now },
      })
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        email: record.user.email,
        message: "Your email is already verified. You can continue to sign in.",
      })
    }

    // Atomic transaction to mark token used and update emailVerified
    const now = new Date()
    const result = await db.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationToken.updateMany({
        where: {
          id: record.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })

      if (claimed.count !== 1) {
        // Concurrently claimed by another process
        const freshUser = await tx.user.findUnique({ where: { id: record.userId } })
        if (freshUser?.emailVerified) {
          return { user: freshUser, alreadyVerified: true }
        }
        throw new Error("ALREADY_USED")
      }

      const updatedUser = await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: record.user.emailVerified || now },
      })

      // Clean up any remaining unconsumed tokens for this user
      await tx.emailVerificationToken.deleteMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
          usedAt: null,
        },
      })

      return { user: updatedUser, alreadyVerified: false }
    })

    return NextResponse.json({
      success: true,
      alreadyVerified: result.alreadyVerified,
      email: result.user.email,
      message: result.alreadyVerified
        ? "Your email is already verified."
        : "Email verified successfully! Your account is ready.",
    })
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_USED") {
      return NextResponse.json(
        {
          success: false,
          reason: "ALREADY_USED",
          error: "This verification link has already been used. If your email is already verified, continue to sign in.",
        },
        { status: 400 }
      )
    }
    console.error("[POST /api/auth/verify-email] Verification error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      {
        success: false,
        error: "Intelly is temporarily unable to complete verification. Please try again in a moment.",
      },
      { status: 500 }
    )
  }
}
