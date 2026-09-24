import { PlatformRole } from "@prisma/client"
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: PlatformRole
      companyRole?: string | null
      organizationId?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
    role: PlatformRole
    companyRole?: string | null
    organizationId?: string
    emailVerified?: Date | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: PlatformRole
    companyRole?: string | null
    organizationId?: string
  }
}
