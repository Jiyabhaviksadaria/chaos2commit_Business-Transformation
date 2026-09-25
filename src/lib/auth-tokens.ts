import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000

export function createRawToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function tokenHashesMatch(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex")
  const expected = Buffer.from(expectedHash, "hex")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function tokenExpiry(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Safely parses the hostname and port from DATABASE_URL without printing credentials.
 */
export function getSafeDatabaseHost(): string {
  try {
    const raw = process.env.DATABASE_URL || ""
    if (!raw) return "not_configured"
    const parsed = new URL(raw)
    return parsed.host
  } catch {
    return "unknown"
  }
}

/**
 * Returns true if a given URL string points to a local development server (e.g. localhost, 127.0.0.1).
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local")
    )
  } catch {
    return false
  }
}

/**
 * Resolves the canonical base URL of the application, taking into account:
 * 1. An optional incoming Request or explicit base URL string.
 * 2. Vercel environment context (Production vs Preview vs Development).
 * 3. Environment variables (APP_URL, NEXTAUTH_URL, AUTH_URL).
 *
 * Guaranteed properties:
 * - On Vercel Preview, prioritizes the PREVIEW deployment hostname over VERCEL_PROJECT_PRODUCTION_URL.
 * - On Vercel (any environment), NEVER returns localhost.
 * - If an incoming request is provided, uses its x-forwarded-host / host.
 * - Strips trailing slashes cleanly.
 */
export function getAppBaseUrl(requestOrBaseUrl?: Request | { headers?: Headers | Record<string, string | undefined> } | string | null): string {
  // 1. If an explicit string was provided
  if (typeof requestOrBaseUrl === "string" && requestOrBaseUrl.trim()) {
    const trimmed = requestOrBaseUrl.trim().replace(/\/+$/, "")
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  const vercelEnv = process.env.VERCEL_ENV // "production" | "preview" | "development"
  const isVercel = Boolean(process.env.VERCEL || vercelEnv)

  // 2. If an incoming Request was provided, inspect headers
  if (requestOrBaseUrl && typeof requestOrBaseUrl === "object" && "headers" in requestOrBaseUrl) {
    try {
      const headers = requestOrBaseUrl.headers
      const getHeader = (name: string): string | null => {
        if (!headers) return null
        if (typeof (headers as Headers).get === "function") {
          return (headers as Headers).get(name)
        }
        const val = (headers as Record<string, string | undefined>)[name]
        return typeof val === "string" ? val : null
      }

      const host = getHeader("x-forwarded-host") || getHeader("host")
      if (host && typeof host === "string") {
        const rawProto = getHeader("x-forwarded-proto")
        const proto = rawProto || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https")
        const candidate = `${proto}://${host}`.replace(/\/+$/, "")

        if (!isVercel || !isLocalhostUrl(candidate)) {
          return candidate
        }
      }
    } catch {
      // Fall through to environment-based resolution
    }
  }

  // 3. Environment-based resolution
  // Case A: Vercel Preview deployment — MUST stay on the preview deployment (never jump to production!)
  if (vercelEnv === "preview") {
    const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
    if (previewHost) {
      return `https://${previewHost}`.replace(/\/+$/, "")
    }
  }

  // Case B: Explicit APP_URL, NEXTAUTH_URL, or AUTH_URL
  const explicit = (process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL || "").trim()
  if (explicit) {
    const candidate = explicit.replace(/\/+$/, "")
    // If on Vercel, reject localhost values (common misconfiguration when .env is copied)
    if (!isVercel || !isLocalhostUrl(candidate)) {
      return candidate.startsWith("http") ? candidate : `https://${candidate}`
    }
  }

  // Case C: Vercel Production deployment
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
  }

  // Case D: VERCEL_URL fallback
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "")
  }

  // Case E: Render deployment
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`.replace(/\/+$/, "")
  }

  // Case F: Local development fallback
  return "http://localhost:3000"
}
