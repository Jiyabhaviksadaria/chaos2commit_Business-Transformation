import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashToken } from "@/lib/auth-tokens"

class InvalidVerificationToken extends Error {}

async function verifyToken(token: string) {
  if (!token || token.length < 32 || token.length > 256) throw new InvalidVerificationToken("Invalid verification link")
  const tokenHash = hashToken(token)
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash }, include: { user: true } })
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw new InvalidVerificationToken("Invalid or expired verification link")

  const now = new Date()
  const result = await db.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })
    if (claimed.count !== 1) throw new InvalidVerificationToken("Invalid or expired verification link")
    await tx.user.update({ where: { id: record.userId }, data: { emailVerified: record.user.emailVerified || now } })
    return record.user
  })
  return result
}

async function handleVerification(request: NextRequest) {
  try {
    const urlToken = request.nextUrl.searchParams.get("token")
    const bodyToken = request.method === "POST" ? ((await request.json().catch(() => ({}))) as { token?: unknown }).token : undefined
    const token = typeof urlToken === "string" && urlToken ? urlToken : typeof bodyToken === "string" ? bodyToken : ""
    const user = await verifyToken(token)
    return NextResponse.json({ success: true, message: "Your email address has been verified.", email: user.email })
  } catch (error) {
    if (error instanceof InvalidVerificationToken) return NextResponse.json({ success: false, error: "This verification link is invalid or has expired." }, { status: 400 })
    console.error("Email verification failed", error)
    return NextResponse.json({ error: "Unable to verify the email address." }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleVerification(request)
}

export async function POST(request: NextRequest) {
  return handleVerification(request)
}
