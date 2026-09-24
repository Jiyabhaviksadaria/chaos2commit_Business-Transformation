import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ getToken: vi.fn() }))
vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }))

import middleware from "@/middleware"

describe("Demo Mode route protection", () => {
  beforeEach(() => vi.clearAllMocks())

  it("keeps unauthenticated page requests protected", async () => {
    mocks.getToken.mockResolvedValue(null)
    const response = await middleware(new NextRequest("http://localhost/projects"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/login")
  })

  it("blocks mutating requests for a valid demo session", async () => {
    mocks.getToken.mockResolvedValue({ isDemo: true })
    const response = await middleware(new NextRequest("http://localhost/api/projects", { method: "POST" }))
    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "This action isn't available in Demo Mode. Sign in with a real account to continue." })
  })

  it("allows read-only demo requests", async () => {
    mocks.getToken.mockResolvedValue({ isDemo: true })
    const response = await middleware(new NextRequest("http://localhost/api/projects"))
    expect(response.status).toBe(200)
  })
})
