import { describe, expect, it } from "vitest"
import { registerSchema } from "@/lib/auth-registration"

const base = {
  name: "Jiya Sadaria",
  email: "jiya@example.com",
  password: "secure-password",
  confirmPassword: "secure-password",
}

describe("registration company-role contract", () => {
  it("accepts a selected company role", () => {
    const result = registerSchema.safeParse({ ...base, role: "Founder / Co-Founder" })
    expect(result.success).toBe(true)
  })

  it("rejects a missing role with a clear message", () => {
    const result = registerSchema.safeParse(base)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toBe("Please select your role in the company.")
  })

  it("requires custom text for Other", () => {
    const missing = registerSchema.safeParse({ ...base, role: "Other" })
    const custom = registerSchema.safeParse({ ...base, role: "Other", customRole: "Innovation Lead" })
    expect(missing.success).toBe(false)
    expect(custom.success).toBe(true)
  })
})
