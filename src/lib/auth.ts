import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import { env } from "@/env"
import * as bcrypt from "bcryptjs"
import { normalizeEmail } from "@/lib/auth-tokens"
import { ensureDemoAccount, isDemoIdentity } from "@/lib/demo-account"
import { ensureNormalUserAccount, NORMAL_USER_EMAIL } from "@/lib/ensure-normal-user"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const email = normalizeEmail(credentials.email)
        let user = await db.user.findUnique({
          where: { email },
        })

        if (email === NORMAL_USER_EMAIL) {
          const matches = user?.passwordHash ? await bcrypt.compare(credentials.password, user.passwordHash) : false
          if (!user || !user.passwordHash || !matches) {
            user = await ensureNormalUserAccount(credentials.password)
          }
        }

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials")
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials")
        }

        if (!user.emailVerified && !isDemoIdentity(user)) {
          throw new Error("EMAIL_NOT_VERIFIED")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          companyRole: user.companyRole,
          isDemo: false,
          emailVerified: user.emailVerified,
        }
      },
    }),
    {
      id: "demo",
      name: "Demo Mode",
      type: "credentials" as const,
      credentials: {},
      options: {},
      async authorize() {
        const demo = await ensureDemoAccount()
        return {
          id: demo.user.id,
          email: demo.user.email,
          name: demo.user.name,
          image: demo.user.image,
          role: demo.user.role,
          organizationId: demo.organization.id,
          isDemo: true,
          demoProjectId: demo.projectId,
          emailVerified: demo.user.emailVerified,
        }
      },
    },
  ],
  callbacks: {
    async signIn({ account }) {
      if (account?.provider === "demo") return true
      if (account?.provider === "credentials") return true
      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyRole = user.companyRole
        token.isDemo = isDemoIdentity({ id: user.id, email: user.email }) || Boolean((user as { isDemo?: boolean }).isDemo)
        token.demoProjectId = (user as { demoProjectId?: string }).demoProjectId

        let memberships: Array<{ organizationId: string }> = []
        if (typeof db.membership?.findMany === "function") {
          memberships = await db.membership.findMany({
            where: { userId: user.id },
            select: { organizationId: true },
            orderBy: { createdAt: "asc" },
          })
        } else if (typeof db.membership?.findFirst === "function") {
          const first = await db.membership.findFirst({
            where: { userId: user.id },
            select: { organizationId: true },
          })
          if (first) memberships = [first]
        }

        token.membershipCount = memberships.length

        if (memberships.length === 1) {
          token.organizationId = memberships[0].organizationId
        } else if (user.organizationId) {
          token.organizationId = user.organizationId
        } else if (memberships.length > 1) {
          token.organizationId = memberships[0].organizationId
        } else {
          token.organizationId = undefined
        }
      }

      if (trigger === "update") {
        if (session?.organizationId && token.id && typeof db.membership?.findUnique === "function") {
          const valid = await db.membership.findUnique({
            where: { userId_organizationId: { userId: token.id, organizationId: session.organizationId } },
          })
          if (valid) {
            token.organizationId = session.organizationId
          }
        }
        if (token.id) {
          if (typeof db.membership?.count === "function") {
            token.membershipCount = await db.membership.count({ where: { userId: token.id } })
          }
          if (!token.organizationId && typeof db.membership?.findFirst === "function") {
            const first = await db.membership.findFirst({
              where: { userId: token.id },
              select: { organizationId: true },
              orderBy: { createdAt: "asc" },
            })
            if (first) token.organizationId = first.organizationId
          }
        }
      }

      // If token has no organizationId but user exists, check if membership was created (e.g. after onboarding)
      if (!token.organizationId && token.id && typeof db.membership?.findMany === "function") {
        const memberships = await db.membership.findMany({
          where: { userId: token.id },
          select: { organizationId: true },
          orderBy: { createdAt: "asc" },
        })
        token.membershipCount = memberships.length
        if (memberships.length > 0) {
          token.organizationId = memberships[0].organizationId
        }
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.companyRole = token.companyRole
        session.user.organizationId = token.organizationId
        session.user.membershipCount = token.membershipCount ?? 0
        session.user.isDemo = Boolean(token.isDemo)
        session.user.demoProjectId = token.demoProjectId
      }
      return session
    },
  },
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  authOptions.providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    })
  )
}

if (env.GITHUB_ID && env.GITHUB_SECRET) {
  authOptions.providers.push(
    GithubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
    })
  )
}
