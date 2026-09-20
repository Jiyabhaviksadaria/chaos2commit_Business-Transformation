import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import * as bcrypt from "bcryptjs"
import { z } from "zod"
import { PlatformRole, OrgRole } from "@prisma/client"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { name, email, password } = registerSchema.parse(json)

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: { code: "CONFLICT", message: "User with this email already exists." } },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: PlatformRole.USER,
        },
      })

      const org = await tx.organization.create({
        data: {
          name: `${name}'s Organization`,
          slug: `${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`,
        },
      })

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: OrgRole.OWNER,
        },
      })

      const workspace = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: "Default Workspace",
          description: "Your personal default workspace.",
        },
      })

      await tx.activityLog.create({
        data: {
          organizationId: org.id,
          actorId: user.id,
          action: "user:register",
          entity: "User",
          entityId: user.id,
          metadata: { message: "User registered and completed personal org seeding" },
        }
      })

      return { user, org, workspace }
    })

    return NextResponse.json({ ok: true, data: { userId: result.user.id } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: zodError.issues[0]?.message } },
        { status: 400 }
      )
    }
    console.error("Register error", error)
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "Registration failed." } },
      { status: 500 }
    )
  }
}
