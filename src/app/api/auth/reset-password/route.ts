import { NextResponse } from "next/server"
import { z } from "zod"
import * as bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { hashToken } from "@/lib/auth-tokens"
import { sendPasswordChangedEmail } from "@/lib/mail/templates/password-changed"
import { DEMO_MODE_RESTRICTION_MESSAGE, isDemoIdentity } from "@/lib/demo-account"

const schema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().max(128),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirmPassword) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match" })
})

class InvalidResetToken extends Error {}

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid password reset request." }, { status: 400 })
    const tokenHash = hashToken(parsed.data.token)
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } })
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new InvalidResetToken("Invalid or expired reset link")
    if (isDemoIdentity(record.user)) return NextResponse.json({ error: DEMO_MODE_RESTRICTION_MESSAGE }, { status: 403 })

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const now = new Date()
    await db.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })
      if (claimed.count !== 1) throw new InvalidResetToken("Invalid or expired reset link")
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } })
      await tx.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } })
    })

    if (record.user.email) await sendPasswordChangedEmail(record.user.name || "there", record.user.email)
    return NextResponse.json({ success: true, message: "Your password has been reset. You can now sign in." })
  } catch (error) {
    if (error instanceof InvalidResetToken) return NextResponse.json({ success: false, error: "This password reset link is invalid or has expired." }, { status: 400 })
    console.error("Password reset failed", error)
    return NextResponse.json({ error: "Unable to reset the password." }, { status: 500 })
  }
}
