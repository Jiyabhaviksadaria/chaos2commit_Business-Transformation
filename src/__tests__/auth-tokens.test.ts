import { describe, expect, it } from "vitest"
import { createRawToken, hashToken, normalizeEmail, tokenExpiry, tokenHashesMatch } from "@/lib/auth-tokens"

describe("authentication tokens", () => {
  it("creates URL-safe random tokens and stable hashes", () => {
    const first = createRawToken()
    const second = createRawToken()
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(first).not.toBe(second)
    expect(hashToken(first)).toHaveLength(64)
    expect(hashToken(first)).toBe(hashToken(first))
    expect(tokenHashesMatch(first, hashToken(first))).toBe(true)
    expect(tokenHashesMatch(second, hashToken(first))).toBe(false)
  })

  it("normalizes email addresses and creates future expiries", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com")
    expect(tokenExpiry(60_000).getTime()).toBeGreaterThan(Date.now())
  })
})
