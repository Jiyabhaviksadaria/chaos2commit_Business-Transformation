import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformRole } from "@prisma/client"

const mocks = vi.hoisted(() => ({ membershipFindFirst: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { membership: { findFirst: mocks.membershipFindFirst } },
}))

import { authOptions } from "@/lib/auth"

describe("authenticated user session", () => {
  beforeEach(() => vi.clearAllMocks())

  it("carries only the selected company role in the session", async () => {
    mocks.membershipFindFirst.mockResolvedValue({ organizationId: "org-1" })
    const jwtCallback = authOptions.callbacks?.jwt
    const sessionCallback = authOptions.callbacks?.session
    expect(jwtCallback).toBeDefined()
    expect(sessionCallback).toBeDefined()

    const token = await jwtCallback!({
      token: {},
      user: { id: "user-1", role: PlatformRole.USER, companyRole: "Founder / Co-Founder" },
    } as never)
    const session = await sessionCallback!({
      session: { user: { id: "user-1", role: PlatformRole.USER, companyRole: null }, expires: "" },
      token,
    } as never)

    const sessionUser = (session as unknown as { user: { companyRole?: string | null } }).user
    expect(sessionUser.companyRole).toBe("Founder / Co-Founder")
    expect(sessionUser).not.toHaveProperty("passwordHash")
    expect(sessionUser).not.toHaveProperty("emailVerificationTokens")
    expect(sessionUser).not.toHaveProperty("passwordResetTokens")
  })
})
