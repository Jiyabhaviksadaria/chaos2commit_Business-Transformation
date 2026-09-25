import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformRole } from "@prisma/client"

const mocks = vi.hoisted(() => ({ membershipFindFirst: vi.fn() }))
vi.mock("@/lib/db", () => ({
  db: { membership: { findFirst: mocks.membershipFindFirst } },
}))

import { authOptions } from "@/lib/auth"

describe("authenticated user session", () => {
  beforeEach(() => vi.clearAllMocks())

  it("registers a dedicated demo provider without changing credentials auth", () => {
    expect(authOptions.providers.some((provider) => provider.id === "demo")).toBe(true)
    expect(authOptions.providers.some((provider) => provider.id === "credentials")).toBe(true)
  })

  it("marks only the dedicated demo identity as demo", async () => {
    mocks.membershipFindFirst.mockResolvedValue({ organizationId: "org-demo" })
    const jwtCallback = authOptions.callbacks?.jwt
    const sessionCallback = authOptions.callbacks?.session
    const token = await jwtCallback!({
      token: {},
      user: { id: "demo-user", email: "demo@intelly.local", role: PlatformRole.USER, companyRole: "Business Analyst", isDemo: true },
    } as never)
    const session = await sessionCallback!({ session: { user: { id: "demo-user", role: PlatformRole.USER }, expires: "" }, token } as never)
    expect((session as unknown as { user: { isDemo?: boolean } }).user.isDemo).toBe(true)
  })

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

    const sessionUser = (session as unknown as { user: { companyRole?: string | null; isDemo?: boolean } }).user
    expect(sessionUser.companyRole).toBe("Founder / Co-Founder")
    expect(sessionUser.isDemo).toBe(false)
    expect(sessionUser).not.toHaveProperty("passwordHash")
    expect(sessionUser).not.toHaveProperty("emailVerificationTokens")
    expect(sessionUser).not.toHaveProperty("passwordResetTokens")
  })
})
