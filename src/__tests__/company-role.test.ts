import { describe, expect, it } from "vitest"
import { COMPANY_ROLE_OPTIONS, isCompanyRoleOption, resolveCompanyRole } from "@/lib/auth-roles"

describe("company roles", () => {
  it("exposes the supported signup options", () => {
    expect(COMPANY_ROLE_OPTIONS).toContain("Founder / Co-Founder")
    expect(COMPANY_ROLE_OPTIONS).toContain("Other")
    expect(isCompanyRoleOption("Finance")).toBe(true)
    expect(isCompanyRoleOption("Not a supported role")).toBe(false)
  })

  it("resolves standard and custom Other roles", () => {
    expect(resolveCompanyRole("Founder / Co-Founder")).toBe("Founder / Co-Founder")
    expect(resolveCompanyRole("Other", "  Head of Innovation  ")).toBe("Head of Innovation")
  })

  it("rejects a custom role when Other has no text", () => {
    expect(() => resolveCompanyRole("Other", "  ")).toThrow("Please enter your role in the company.")
  })
})
