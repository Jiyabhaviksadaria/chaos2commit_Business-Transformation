export const COMPANY_ROLE_OPTIONS = [
  "Founder / Co-Founder",
  "CEO / Managing Director",
  "CTO / CIO",
  "Product Manager",
  "Engineering / Technology",
  "Operations",
  "Finance",
  "HR / People",
  "Marketing / Sales",
  "Business Analyst",
  "Consultant",
  "Project Manager",
  "Other",
] as const

export type CompanyRoleOption = (typeof COMPANY_ROLE_OPTIONS)[number]

export function isCompanyRoleOption(value: string): value is CompanyRoleOption {
  return (COMPANY_ROLE_OPTIONS as readonly string[]).includes(value)
}

export function resolveCompanyRole(role: string, customRole?: string): string {
  const normalizedRole = role.trim()
  if (!isCompanyRoleOption(normalizedRole)) {
    throw new Error("Please select a valid role in the company.")
  }
  if (normalizedRole !== "Other") return normalizedRole

  const normalizedCustomRole = customRole?.trim()
  if (!normalizedCustomRole) {
    throw new Error("Please enter your role in the company.")
  }
  return normalizedCustomRole
}
