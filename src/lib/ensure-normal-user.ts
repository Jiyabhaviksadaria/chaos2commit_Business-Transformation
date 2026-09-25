import { db } from "@/lib/db"
import { PlatformRole, OrgRole } from "@prisma/client"
import * as bcrypt from "bcryptjs"

export const NORMAL_USER_EMAIL = "jiyasadaria@gmail.com"
export const DEFAULT_NORMAL_USER_PASSWORD = "8264364507"

export async function ensureNormalUserAccount(providedPassword?: string) {
  const email = NORMAL_USER_EMAIL
  const password = providedPassword || process.env.JIYA_SADARIA_INITIAL_PASSWORD || DEFAULT_NORMAL_USER_PASSWORD
  const passwordHash = await bcrypt.hash(password, 10)

  const existingUser = await db.user.findUnique({ where: { email } })

  if (!existingUser) {
    const user = await db.user.create({
      data: {
        email,
        name: "Jiya Sadaria",
        companyRole: "Business Analyst",
        role: PlatformRole.USER,
        isDemo: false,
        passwordHash,
        emailVerified: new Date(),
      }
    })

    const org = await db.organization.create({
      data: {
        name: "Jiya Sadaria's Organization",
        slug: `org-jiya-sadaria-${Date.now()}`,
      }
    })

    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: OrgRole.OWNER,
      }
    })

    await db.workspace.create({
      data: {
        organizationId: org.id,
        name: "Default Workspace",
        description: "Personal default workspace",
      }
    })

    return user
  }

  // Ensure normal account fields are properly set (isDemo = false)
  const updatedUser = await db.user.update({
    where: { email },
    data: {
      name: "Jiya Sadaria",
      companyRole: "Business Analyst",
      isDemo: false,
      emailVerified: existingUser.emailVerified || new Date(),
      passwordHash: passwordHash,
    }
  })

  return updatedUser
}
