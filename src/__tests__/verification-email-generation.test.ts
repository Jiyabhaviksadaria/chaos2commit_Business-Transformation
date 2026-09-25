import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mailMocks = vi.hoisted(() => ({ sendMail: vi.fn() }))
vi.mock("@/lib/mail/mailer", () => ({ sendMail: mailMocks.sendMail }))

import { sendVerificationEmail } from "@/lib/mail/templates/verification"
import { getAppBaseUrl, isLocalhostUrl } from "@/lib/auth-tokens"

describe("Verification Email URL Generation & Environment Resolution", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mailMocks.sendMail.mockReset()
    mailMocks.sendMail.mockResolvedValue(true)
    process.env = { ...originalEnv }
  })

  describe("Unit resolution with getAppBaseUrl", () => {
    it("returns localhost:3000 for local environment without headers", () => {
      delete process.env.VERCEL
      delete process.env.VERCEL_ENV
      delete process.env.VERCEL_URL
      delete process.env.VERCEL_PROJECT_PRODUCTION_URL
      delete process.env.APP_URL
      delete process.env.NEXTAUTH_URL
      delete process.env.NOW_REGION

      expect(getAppBaseUrl()).toBe("http://localhost:3000")
      expect(isLocalhostUrl(getAppBaseUrl())).toBe(true)
    })

    it("returns localhost:3000 for local request with host localhost:3000", () => {
      delete process.env.VERCEL
      delete process.env.VERCEL_ENV
      delete process.env.VERCEL_URL
      delete process.env.NOW_REGION

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          host: "localhost:3000",
        },
      })

      expect(getAppBaseUrl(req)).toBe("http://localhost:3000")
    })

    it("rejects localhost when running in Vercel environment even if host header is localhost:3000", () => {
      process.env.VERCEL = "1"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly.ai"

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          host: "localhost:3000",
        },
      })

      const resolved = getAppBaseUrl(req)
      expect(resolved).not.toContain("localhost:3000")
      expect(resolved).toBe("https://intelly.ai")
    })
  })

  describe("Actual email-generation path via sendVerificationEmail", () => {
    it("LOCAL: request host localhost -> email contains localhost URL", async () => {
      delete process.env.VERCEL
      delete process.env.VERCEL_ENV
      delete process.env.VERCEL_URL
      delete process.env.NOW_REGION
      delete process.env.APP_URL

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          host: "localhost:3000",
        },
      })

      const testToken = "test_local_token_12345"
      const result = await sendVerificationEmail("Alice", "alice@example.com", testToken, req)
      expect(result).toBe(true)
      expect(mailMocks.sendMail).toHaveBeenCalledTimes(1)

      const [options] = mailMocks.sendMail.mock.calls[0]
      const expectedUrl = `http://localhost:3000/verify-email?token=${encodeURIComponent(testToken)}`

      expect(options.html).toContain(expectedUrl)
      expect(options.text).toContain(expectedUrl)
      expect(options.html).toContain("http://localhost:3000")
    })

    it("VERCEL PREVIEW: request host preview.vercel.app -> email contains preview URL and NEVER localhost", async () => {
      process.env.VERCEL = "1"
      process.env.VERCEL_ENV = "preview"
      process.env.VERCEL_BRANCH_URL = "intelly-git-khushi.vercel.app"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly.ai"

      // Simulate Vercel routing where internal lambda host is localhost:3000 but x-forwarded-host is the preview domain
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          "x-forwarded-host": "intelly-git-khushi.vercel.app",
          "x-forwarded-proto": "https",
          host: "localhost:3000",
          origin: "https://intelly-git-khushi.vercel.app",
        },
      })

      const testToken = "test_preview_token_abcdef"
      const result = await sendVerificationEmail("Bob", "bob@example.com", testToken, req)
      expect(result).toBe(true)
      expect(mailMocks.sendMail).toHaveBeenCalledTimes(1)

      const [options] = mailMocks.sendMail.mock.calls[0]
      const expectedUrl = `https://intelly-git-khushi.vercel.app/verify-email?token=${encodeURIComponent(testToken)}`

      expect(options.html).toContain(expectedUrl)
      expect(options.text).toContain(expectedUrl)
      expect(options.html).not.toContain("localhost:3000")
      expect(options.text).not.toContain("localhost:3000")
    })

    it("VERCEL PRODUCTION: request host production domain -> email contains production URL and NEVER localhost", async () => {
      process.env.VERCEL = "1"
      process.env.VERCEL_ENV = "production"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly.ai"

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          "x-forwarded-host": "intelly.ai",
          "x-forwarded-proto": "https",
          host: "localhost:3000",
        },
      })

      const testToken = "test_prod_token_987654"
      const result = await sendVerificationEmail("Carol", "carol@intelly.ai", testToken, req)
      expect(result).toBe(true)
      expect(mailMocks.sendMail).toHaveBeenCalledTimes(1)

      const [options] = mailMocks.sendMail.mock.calls[0]
      const expectedUrl = `https://intelly.ai/verify-email?token=${encodeURIComponent(testToken)}`

      expect(options.html).toContain(expectedUrl)
      expect(options.text).toContain(expectedUrl)
      expect(options.html).not.toContain("localhost:3000")
      expect(options.text).not.toContain("localhost:3000")
    })

    it("VERCEL: falls back safely to origin header if x-forwarded-host is missing", async () => {
      process.env.VERCEL = "1"
      process.env.VERCEL_ENV = "preview"

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          origin: "https://intelly-git-preview-branch.vercel.app",
          host: "localhost:3000",
        },
      })

      const testToken = "test_origin_token_777"
      const result = await sendVerificationEmail("Dan", "dan@example.com", testToken, req)
      expect(result).toBe(true)

      const [options] = mailMocks.sendMail.mock.calls[0]
      const expectedUrl = `https://intelly-git-preview-branch.vercel.app/verify-email?token=${encodeURIComponent(testToken)}`
      expect(options.html).toContain(expectedUrl)
      expect(options.html).not.toContain("localhost:3000")
    })

    it("VERCEL: never returns localhost even if APP_URL is erroneously set to localhost:3000", async () => {
      process.env.VERCEL = "1"
      process.env.VERCEL_ENV = "preview"
      process.env.APP_URL = "http://localhost:3000"
      process.env.VERCEL_URL = "intelly-fallback.vercel.app"

      const testToken = "test_fallback_token_999"
      // No request provided, forcing environment variable resolution
      const result = await sendVerificationEmail("Eve", "eve@example.com", testToken)
      expect(result).toBe(true)

      const [options] = mailMocks.sendMail.mock.calls[0]
      const expectedUrl = `https://intelly-fallback.vercel.app/verify-email?token=${encodeURIComponent(testToken)}`
      expect(options.html).toContain(expectedUrl)
      expect(options.html).not.toContain("localhost:3000")
    })
  })

  describe("Diagnostics logging format check", () => {
    it("prints [AUTH_DIAGNOSTICS] with all required fields and no secrets", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

      process.env.VERCEL_ENV = "preview"
      process.env.APP_URL = "https://app.intelly.ai"
      process.env.NEXTAUTH_URL = "https://app.intelly.ai"
      process.env.VERCEL_URL = "intelly-git-khushi.vercel.app"
      process.env.VERCEL_BRANCH_URL = "intelly-git-khushi.vercel.app"
      process.env.VERCEL_PROJECT_PRODUCTION_URL = "intelly.ai"

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        headers: {
          "x-forwarded-host": "intelly-git-khushi.vercel.app",
          "x-forwarded-proto": "https",
        },
      })

      const testToken = "super_secret_raw_token_xyz"
      await sendVerificationEmail("Frank", "frank@example.com", testToken, req)

      expect(consoleSpy).toHaveBeenCalled()
      const loggedCall = consoleSpy.mock.calls.find((call) =>
        typeof call[0] === "string" && call[0].includes("[AUTH_DIAGNOSTICS]")
      )
      expect(loggedCall).toBeDefined()
      const logOutput = loggedCall![0] as string

      expect(logOutput).toContain("[AUTH_DIAGNOSTICS]")
      expect(logOutput).toContain("VERCEL_ENV=preview")
      expect(logOutput).toContain("APP_URL_HOST=app.intelly.ai")
      expect(logOutput).toContain("NEXTAUTH_URL_HOST=app.intelly.ai")
      expect(logOutput).toContain("VERCEL_URL=intelly-git-khushi.vercel.app")
      expect(logOutput).toContain("VERCEL_BRANCH_URL=intelly-git-khushi.vercel.app")
      expect(logOutput).toContain("VERCEL_PROJECT_PRODUCTION_URL=intelly.ai")
      expect(logOutput).toContain("FORWARDED_HOST=intelly-git-khushi.vercel.app")
      expect(logOutput).toContain("FORWARDED_PROTO=https")
      expect(logOutput).toContain("RESOLVED_BASE_URL=https://intelly-git-khushi.vercel.app")

      // Ensure no raw tokens or credentials are in the log
      expect(logOutput).not.toContain(testToken)
      expect(logOutput).not.toContain("password")
      expect(logOutput).not.toContain("secret")

      consoleSpy.mockRestore()
    })
  })
})
