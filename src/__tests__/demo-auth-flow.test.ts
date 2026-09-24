import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  ensureDemoAccount: vi.fn(),
  membershipFindFirst: vi.fn(),
}))

vi.mock("@/lib/demo-account", () => ({
  ensureDemoAccount: mocks.ensureDemoAccount,
  isDemoIdentity: (value: { id?: string | null; email?: string | null } | null | undefined) => value?.id === "demo-user-intelly" || value?.email === "demo@intelly.app",
}))

vi.mock("@/lib/db", () => ({
  db: { membership: { findFirst: mocks.membershipFindFirst } },
}))

import { authOptions } from "@/lib/auth"

describe("Demo authentication provider", () => {
  it("uses a real credentials provider with a dedicated identity", async () => {
    mocks.ensureDemoAccount.mockResolvedValue({
      user: { id: "demo-user-intelly", email: "demo@intelly.app", name: "Intelly Demo User", image: null, role: "USER", companyRole: "Business Analyst", emailVerified: new Date() },
      organization: { id: "demo-org-intelly" },
      projectId: "demo-project-intelly",
    })
    const provider = authOptions.providers.find((item) => item.id === "demo")
    expect(provider).toBeDefined()
    const authorize = (provider as unknown as { authorize: (credentials: Record<string, unknown>, req: Request) => Promise<unknown> }).authorize
    const user = await authorize({}, {} as Request)
    expect(user).toEqual(expect.objectContaining({ id: "demo-user-intelly", email: "demo@intelly.app", isDemo: true, demoProjectId: "demo-project-intelly" }))
    expect(mocks.ensureDemoAccount).toHaveBeenCalledOnce()
  })
})
