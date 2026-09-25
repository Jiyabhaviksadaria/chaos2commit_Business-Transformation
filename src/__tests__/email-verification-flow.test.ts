import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    organization: {
      create: vi.fn(),
    },
    membership: {
      create: vi.fn(),
    },
    workspace: {
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mocks.db)),
  },
  sendVerificationEmail: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}))

vi.mock("@/lib/mail/templates/verification", () => ({
  sendVerificationEmail: mocks.sendVerificationEmail,
}))

import { GET as inspectVerifyToken, POST as confirmVerifyToken } from "@/app/api/auth/verify-email/route"
import { POST as resendVerification } from "@/app/api/auth/resend-verification/route"
import { hashToken, getAppBaseUrl, createRawToken } from "@/lib/auth-tokens"
import { NextRequest } from "next/server"

describe("Email Verification and Auth Flow Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.db.$transaction.mockImplementation((cb) => cb(mocks.db))
  })

  describe("getAppBaseUrl canonical URL resolution", () => {
    it("normalizes base URLs and strips trailing slashes", () => {
      const originalAppUrl = process.env.APP_URL
      process.env.APP_URL = "https://app.intelly.ai///"
      expect(getAppBaseUrl()).toBe("https://app.intelly.ai")
      process.env.APP_URL = originalAppUrl
    })

    it("falls back to VERCEL_URL if APP_URL is not explicitly set", () => {
      const originalAppUrl = process.env.APP_URL
      const originalNextAuthUrl = process.env.NEXTAUTH_URL
      delete process.env.APP_URL
      delete process.env.NEXTAUTH_URL
      process.env.VERCEL_URL = "intelly-production.vercel.app"

      expect(getAppBaseUrl()).toBe("https://intelly-production.vercel.app")

      process.env.APP_URL = originalAppUrl
      process.env.NEXTAUTH_URL = originalNextAuthUrl
      delete process.env.VERCEL_URL
    })

    it("stays on preview domain in Vercel Preview (never jumps to production)", () => {
      const originalVercelEnv = process.env.VERCEL_ENV
      const originalVercelUrl = process.env.VERCEL_URL
      const originalProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      const originalAppUrl = process.env.APP_URL

      delete process.env.APP_URL
      process.env.VERCEL_ENV = "preview"
      process.env.VERCEL_URL = "intelly-git-khushi-acme.vercel.app"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly-production.vercel.app"

      expect(getAppBaseUrl()).toBe("https://intelly-git-khushi-acme.vercel.app")

      process.env.VERCEL_ENV = originalVercelEnv
      process.env.VERCEL_URL = originalVercelUrl
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProdUrl
      process.env.APP_URL = originalAppUrl
    })

    it("rejects localhost on Vercel deployments and falls back to Vercel URL", () => {
      const originalVercel = process.env.VERCEL
      const originalAppUrl = process.env.APP_URL
      const originalProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

      process.env.VERCEL = "1"
      process.env.APP_URL = "http://localhost:3000"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly-production.vercel.app"

      expect(getAppBaseUrl()).toBe("https://intelly-production.vercel.app")

      process.env.VERCEL = originalVercel
      process.env.APP_URL = originalAppUrl
      process.env.VERCEL_PROJECT_PRODUCTION_URL = originalProdUrl
    })

    it("derives origin from request x-forwarded-host if provided", () => {
      const req = new NextRequest("http://internal-server:3000/api/auth/register", {
        headers: {
          "x-forwarded-host": "intelly-pr-42.vercel.app",
          "x-forwarded-proto": "https",
        },
      })

      expect(getAppBaseUrl(req)).toBe("https://intelly-pr-42.vercel.app")
    })
  })

  describe("GET /api/auth/verify-email (Safe Token Inspection)", () => {
    it("returns valid: true on valid pending token WITHOUT consuming it", async () => {
      const rawToken = createRawToken()
      const tokenHash = hashToken(rawToken)

      mocks.db.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        usedAt: null,
        user: { id: "user-1", email: "test@example.com", name: "Test User", emailVerified: null },
      })

      const req = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${rawToken}`)
      const res = await inspectVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.email).toBe("test@example.com")
      expect(mocks.db.emailVerificationToken.update).not.toHaveBeenCalled()
      expect(mocks.db.emailVerificationToken.updateMany).not.toHaveBeenCalled()
    })

    it("detects already verified tokens gracefully on GET", async () => {
      const rawToken = createRawToken()
      const tokenHash = hashToken(rawToken)

      mocks.db.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        usedAt: new Date(),
        user: { id: "user-1", email: "test@example.com", name: "Test User", emailVerified: new Date() },
      })

      const req = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${rawToken}`)
      const res = await inspectVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.valid).toBe(false)
      expect(data.alreadyVerified).toBe(true)
    })

    it("identifies expired tokens on GET", async () => {
      const rawToken = createRawToken()
      const tokenHash = hashToken(rawToken)

      mocks.db.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        usedAt: null,
        user: { id: "user-1", email: "test@example.com", name: "Test User", emailVerified: null },
      })

      const req = new NextRequest(`http://localhost:3000/api/auth/verify-email?token=${rawToken}`)
      const res = await inspectVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.valid).toBe(false)
      expect(data.reason).toBe("EXPIRED")
    })
  })

  describe("POST /api/auth/verify-email (Token Consumption & Confirmation)", () => {
    it("atomically consumes token and updates user.emailVerified", async () => {
      const rawToken = createRawToken()
      const tokenHash = hashToken(rawToken)
      const now = new Date()

      mocks.db.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        usedAt: null,
        user: { id: "user-1", email: "test@example.com", name: "Test User", emailVerified: null },
      })
      mocks.db.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 })
      mocks.db.user.update.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: now,
      })
      mocks.db.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 })

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      })

      const res = await confirmVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.email).toBe("test@example.com")
      expect(mocks.db.emailVerificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "tok-1", usedAt: null }),
        })
      )
      expect(mocks.db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
        })
      )
    })

    it("handles duplicate verification clicks idempotently without error", async () => {
      const rawToken = createRawToken()
      const tokenHash = hashToken(rawToken)

      mocks.db.emailVerificationToken.findUnique.mockResolvedValue({
        id: "tok-1",
        userId: "user-1",
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        usedAt: new Date(),
        user: { id: "user-1", email: "test@example.com", name: "Test User", emailVerified: new Date() },
      })

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      })

      const res = await confirmVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.alreadyVerified).toBe(true)
      expect(data.message).toContain("already verified")
    })

    it("rejects invalid or non-existent token with 400", async () => {
      mocks.db.emailVerificationToken.findUnique.mockResolvedValue(null)

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token-string-that-does-not-exist-32-chars" }),
      })

      const res = await confirmVerifyToken(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.reason).toBe("NOT_FOUND")
    })
  })

  describe("POST /api/auth/resend-verification", () => {
    it("resends verification for unverified user and invalidates older pending tokens", async () => {
      mocks.db.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
      })
      mocks.db.emailVerificationToken.findFirst.mockResolvedValue(null) // No recent token
      mocks.db.emailVerificationToken.deleteMany.mockResolvedValue({ count: 1 })
      mocks.db.emailVerificationToken.create.mockResolvedValue({ id: "tok-2" })
      mocks.sendVerificationEmail.mockResolvedValue(true)

      const req = new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })

      const res = await resendVerification(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mocks.db.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", usedAt: null },
      })
      expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(
        "Test User",
        "test@example.com",
        expect.any(String),
        expect.anything()
      )
    })

    it("applies cooldown and rejects repeated resend requests with 429", async () => {
      mocks.db.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
      })
      // Created 10 seconds ago (cooldown is 60s)
      mocks.db.emailVerificationToken.findFirst.mockResolvedValue({
        id: "tok-recent",
        createdAt: new Date(Date.now() - 10_000),
      })

      const req = new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })

      const res = await resendVerification(req)
      const data = await res.json()

      expect(res.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.rateLimited).toBe(true)
      expect(data.retryAfterSeconds).toBeGreaterThan(0)
    })

    it("informs already-verified user directly without spamming new links", async () => {
      mocks.db.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        emailVerified: new Date(),
      })

      const req = new Request("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })

      const res = await resendVerification(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.alreadyVerified).toBe(true)
      expect(mocks.sendVerificationEmail).not.toHaveBeenCalled()
    })
  })
})
