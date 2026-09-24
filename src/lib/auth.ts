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
        const user = await db.user.findUnique({
          where: { email },
        })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials")
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED")
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          companyRole: user.companyRole,
          emailVerified: user.emailVerified,
        }
      },
    }),
    CredentialsProvider({
      id: "demo",
      name: "Demo Mode",
      credentials: {},
      async authorize() {
        const demo = await ensureDemoAccount()
        return {
          id: demo.user.id,
          email: demo.user.email,
          name: demo.user.name,
          image: demo.user.image,
          role: demo.user.role,
          companyRole: demo.user.companyRole,
          organizationId: demo.organization.id,
          isDemo: true,
          emailVerified: demo.user.emailVerified,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "demo") return true
      if (account?.provider === "credentials") return Boolean((user as { emailVerified?: Date | null }).emailVerified)
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyRole = user.companyRole
        token.isDemo = isDemoIdentity({ id: user.id, email: user.email }) || Boolean((user as { isDemo?: boolean }).isDemo)

        const firstMembership = await db.membership.findFirst({
          where: { userId: user.id },
          select: { organizationId: true },
        })

        if (firstMembership) {
          token.organizationId = firstMembership.organizationId
        } else if (user.organizationId) {
          token.organizationId = user.organizationId
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
        session.user.isDemo = Boolean(token.isDemo)
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
