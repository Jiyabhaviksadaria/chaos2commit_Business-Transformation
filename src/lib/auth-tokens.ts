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
