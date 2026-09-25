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
/**
 * Returns true if the runtime is executing within a Vercel deployment (Preview, Production, or Serverless Function).
 */
export function isVercelEnvironment(): boolean {
  return Boolean(
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.NOW_REGION
  )
}

function extractHostOnly(urlOrHost?: string | null): string {
  if (!urlOrHost || !urlOrHost.trim()) return "<not_set>"
  try {
    const raw = urlOrHost.trim()
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
    return parsed.hostname
  } catch {
    return urlOrHost.split("/")[0] || "<invalid>"
  }
}

/**
 * Temporary safe diagnostic logger required for Vercel URL verification.
 * Logs server-side deployment and request parameters without exposing secrets or tokens.
 */
export function logAuthDiagnostics(
  requestOrBaseUrl: Request | { headers?: Headers | Record<string, string | undefined>; url?: string } | string | null | undefined,
  resolvedBaseUrl: string
): void {
  try {
    const headers =
      requestOrBaseUrl && typeof requestOrBaseUrl === "object" && "headers" in requestOrBaseUrl
        ? (requestOrBaseUrl as { headers?: Headers | Record<string, string | undefined> }).headers
        : null

    const getHeader = (name: string): string => {
      if (!headers) return "<not_set>"
      if (typeof (headers as Headers).get === "function") {
        return (headers as Headers).get(name) || "<not_set>"
      }
      return (headers as Record<string, string | undefined>)[name] || "<not_set>"
    }

    console.log(
      `[AUTH_DIAGNOSTICS]\n` +
      `VERCEL_ENV=${process.env.VERCEL_ENV || "<not_set>"}\n` +
      `APP_URL_HOST=${extractHostOnly(process.env.APP_URL)}\n` +
      `NEXTAUTH_URL_HOST=${extractHostOnly(process.env.NEXTAUTH_URL)}\n` +
      `VERCEL_URL=${process.env.VERCEL_URL || "<not_set>"}\n` +
      `VERCEL_BRANCH_URL=${process.env.VERCEL_BRANCH_URL || "<not_set>"}\n` +
      `VERCEL_PROJECT_PRODUCTION_URL=${process.env.VERCEL_PROJECT_PRODUCTION_URL || "<not_set>"}\n` +
      `FORWARDED_HOST=${getHeader("x-forwarded-host")}\n` +
      `FORWARDED_PROTO=${getHeader("x-forwarded-proto")}\n` +
      `RESOLVED_BASE_URL=${resolvedBaseUrl}`
    )
  } catch {
    // Non-blocking diagnostic logger
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
 * - If an incoming request is provided, uses its x-forwarded-host / origin / host / url.
 * - Strips trailing slashes cleanly.
 */
export function getAppBaseUrl(requestOrBaseUrl?: Request | { headers?: Headers | Record<string, string | undefined>; url?: string } | string | null): string {
  const isVercel = isVercelEnvironment()
  const vercelEnv = process.env.VERCEL_ENV // "production" | "preview" | "development"

  // 1. If an explicit string was provided
  if (typeof requestOrBaseUrl === "string" && requestOrBaseUrl.trim()) {
    const trimmed = requestOrBaseUrl.trim().replace(/\/+$/, "")
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    if (!isVercel || !isLocalhostUrl(candidate)) {
      return candidate
    }
  }

  // 2. If an incoming Request was provided, inspect headers & url
  if (requestOrBaseUrl && typeof requestOrBaseUrl === "object") {
    try {
      const headers = (requestOrBaseUrl as { headers?: Headers | Record<string, string | undefined> }).headers
      const getHeader = (name: string): string | null => {
        if (!headers) return null
        if (typeof (headers as Headers).get === "function") {
          return (headers as Headers).get(name)
        }
        const val = (headers as Record<string, string | undefined>)[name]
        return typeof val === "string" ? val : null
      }

      // 2a. Priority: x-forwarded-host (Standard on Vercel and reverse proxies)
      const forwardedHost = getHeader("x-forwarded-host")
      if (forwardedHost && typeof forwardedHost === "string" && forwardedHost.trim()) {
        const cleanHost = forwardedHost.split(",")[0].trim()
        const isCleanLocal = isLocalhostUrl(cleanHost)
        if (!isVercel || !isCleanLocal) {
          const rawProto = getHeader("x-forwarded-proto")
          const proto = rawProto || (isCleanLocal ? "http" : "https")
          return `${proto}://${cleanHost}`.replace(/\/+$/, "")
        }
      }

      // 2b. Priority: origin header (sent on browser POST / fetch requests)
      const originHeader = getHeader("origin")
      if (originHeader && typeof originHeader === "string" && /^https?:\/\//i.test(originHeader.trim())) {
        const cleanOrigin = originHeader.trim().replace(/\/+$/, "")
        if (!isVercel || !isLocalhostUrl(cleanOrigin)) {
          return cleanOrigin
        }
      }

      // 2c. Priority: referer header
      const refererHeader = getHeader("referer")
      if (refererHeader && typeof refererHeader === "string" && /^https?:\/\//i.test(refererHeader.trim())) {
        try {
          const refererOrigin = new URL(refererHeader.trim()).origin
          if (!isVercel || !isLocalhostUrl(refererOrigin)) {
            return refererOrigin
          }
        } catch {
          // Ignore
        }
      }

      // 2d. Priority: host header
      const hostHeader = getHeader("host")
      if (hostHeader && typeof hostHeader === "string" && hostHeader.trim()) {
        const cleanHost = hostHeader.split(",")[0].trim()
        const isCleanLocal = isLocalhostUrl(cleanHost)
        if (!isVercel || !isCleanLocal) {
          const rawProto = getHeader("x-forwarded-proto")
          const proto = rawProto || (isCleanLocal ? "http" : "https")
          return `${proto}://${cleanHost}`.replace(/\/+$/, "")
        }
      }

      // 2e. Priority: req.url (Standard Web API Request url)
      if ("url" in requestOrBaseUrl && typeof (requestOrBaseUrl as { url?: unknown }).url === "string") {
        const rawUrl = (requestOrBaseUrl as { url: string }).url
        if (/^https?:\/\//i.test(rawUrl)) {
          try {
            const reqOrigin = new URL(rawUrl).origin
            if (!isVercel || !isLocalhostUrl(reqOrigin)) {
              return reqOrigin
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // Fall through to environment-based resolution
    }
  }

  // 3. Environment-based resolution
  // Case A: Vercel Preview deployment (prioritize preview domain, but never return localhost)
  if (vercelEnv === "preview") {
    const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
    if (previewHost && !isLocalhostUrl(previewHost)) {
      return `https://${previewHost}`.replace(/\/+$/, "")
    }
  }

  // Case B: Explicit APP_URL
  const explicitAppUrl = (process.env.APP_URL || "").trim()
  if (explicitAppUrl) {
    const candidate = explicitAppUrl.replace(/\/+$/, "")
    if (!isVercel || !isLocalhostUrl(candidate)) {
      return candidate.startsWith("http") ? candidate : `https://${candidate}`
    }
  }

  // Case C: Explicit NEXTAUTH_URL or AUTH_URL
  const explicitNextAuth = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || "").trim()
  if (explicitNextAuth) {
    const candidate = explicitNextAuth.replace(/\/+$/, "")
    if (!isVercel || !isLocalhostUrl(candidate)) {
      return candidate.startsWith("http") ? candidate : `https://${candidate}`
    }
  }

  // Case D: Vercel Production domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL && !isLocalhostUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
  }

  // Case E: VERCEL_URL fallback
  if (process.env.VERCEL_URL && !isLocalhostUrl(process.env.VERCEL_URL)) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "")
  }

  // Case F: Render deployment
  if (process.env.RENDER_EXTERNAL_HOSTNAME && !isLocalhostUrl(process.env.RENDER_EXTERNAL_HOSTNAME)) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`.replace(/\/+$/, "")
  }

  // Case G: If running on Vercel, NEVER return localhost under any circumstance
  if (isVercel) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "")
    }
    if (process.env.VERCEL_BRANCH_URL) {
      return `https://${process.env.VERCEL_BRANCH_URL}`.replace(/\/+$/, "")
    }
    return "https://intelly-production.vercel.app"
  }

  // Case H: Local development fallback
  return "http://localhost:3000"
}
