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
 * Returns the canonical base URL of the application, normalizing environment variables
 * and inferring Vercel/Render hostnames to prevent broken localhost links in production.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.AUTH_URL
  if (explicit && explicit.trim()) {
    return explicit.trim().replace(/\/+$/, "")
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "")
  }
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`.replace(/\/+$/, "")
  }

  return "http://localhost:3000"
}
