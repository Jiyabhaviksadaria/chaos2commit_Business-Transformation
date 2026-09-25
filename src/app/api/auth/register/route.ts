import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { PlatformRole, Prisma } from "@prisma/client"
import { createRawToken, EMAIL_VERIFICATION_TOKEN_TTL_MS, hashToken, normalizeEmail, tokenExpiry } from "@/lib/auth-tokens"
import { resolveCompanyRole } from "@/lib/auth-roles"
import { registerSchema } from "@/lib/auth-registration"
import { sendVerificationEmail } from "@/lib/mail/templates/verification"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid registration details" } }, { status: 400 })
    }

    const { name, password, role, customRole } = parsed.data
    const email = normalizeEmail(parsed.data.email)
    let companyRole: string
    try {
      companyRole = resolveCompanyRole(role, customRole)
    } catch (error) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: error instanceof Error ? error.message : "Please select your role in the company." } }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ ok: false, error: { code: "CONFLICT", message: "User with this email already exists." } }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const rawToken = createRawToken()
    const tokenHash = hashToken(rawToken)

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, companyRole, emailVerified: null, role: PlatformRole.USER },
      })

      await tx.emailVerificationToken.create({
        data: { userId: user.id, tokenHash, expiresAt: tokenExpiry(EMAIL_VERIFICATION_TOKEN_TTL_MS) },
      })

      return { user }
    })

    const emailSent = await sendVerificationEmail(name, email, rawToken)
    let autoVerified = false
    if (!emailSent) {
      await db.user.update({
        where: { id: result.user.id },
        data: { emailVerified: new Date() }
      })
      autoVerified = true
    }
    return NextResponse.json({ ok: true, data: { userId: result.user.id, companyRole }, requiresEmailVerification: !autoVerified, emailSent, autoVerified })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: { code: "CONFLICT", message: "User with this email already exists." } }, { status: 409 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message } }, { status: 400 })
    }
    console.error("Register error", error)
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Registration failed." } }, { status: 500 })
  }
}
