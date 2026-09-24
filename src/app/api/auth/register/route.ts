import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { PlatformRole, OrgRole, Prisma } from "@prisma/client"
import { createRawToken, EMAIL_VERIFICATION_TOKEN_TTL_MS, hashToken, normalizeEmail, tokenExpiry } from "@/lib/auth-tokens"
import { isCompanyRoleOption, resolveCompanyRole } from "@/lib/auth-roles"
import { sendVerificationEmail } from "@/lib/mail/templates/verification"

const roleSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().min(1, "Please select your role in the company.").max(100),
)

const customRoleSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : undefined),
  z.string().max(100, "Please enter a role under 100 characters.").optional(),
)

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Invalid email address").max(320),
  role: roleSchema,
  customRole: customRoleSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(1, "Please confirm your password.").max(128),
}).superRefine((value, ctx) => {
  if (!isCompanyRoleOption(value.role)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "Please select a valid role in the company." })
  }
  if (value.role === "Other" && !value.customRole) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customRole"], message: "Please enter your role in the company." })
  }
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match" })
  }
})

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

      const org = await tx.organization.create({
        data: { name: `${name}'s Organization`, slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now()}` },
      })
      await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: OrgRole.OWNER } })
      await tx.workspace.create({ data: { organizationId: org.id, name: "Default Workspace", description: "Your personal default workspace." } })
      await tx.activityLog.create({ data: { organizationId: org.id, projectId: null, actorId: user.id, action: "user:register", entity: "User", entityId: user.id, metadata: { message: "User registered; email verification required", companyRole } } })
      return { user }
    })

    const emailSent = await sendVerificationEmail(name, email, rawToken)
    return NextResponse.json({ ok: true, data: { userId: result.user.id, companyRole }, requiresEmailVerification: true, emailSent })
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
