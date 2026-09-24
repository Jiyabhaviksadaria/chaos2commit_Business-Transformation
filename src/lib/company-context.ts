import { z } from "zod"

export const COMPANY_SIZE_OPTIONS = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–1,000 employees",
  "1,001–5,000 employees",
  "5,001+ employees",
  "Other",
] as const

export const COMPANY_ROLE_OPTIONS = [
  "Founder",
  "CEO",
  "CTO",
  "COO",
  "Product Manager",
  "Operations Manager",
  "Engineering Manager",
  "Finance Manager",
  "HR Manager",
  "Marketing Manager",
  "Sales Manager",
  "IT Manager",
  "Business Analyst",
  "Consultant",
  "Other",
] as const

export const CURRENT_TOOL_OPTIONS = [
  "Excel",
  "Google Sheets",
  "Salesforce",
  "SAP",
  "Shopify",
  "WhatsApp",
  "Custom software",
  "Legacy ERP",
  "POS",
  "Email",
  "Manual processes",
  "Other",
] as const

export const BUSINESS_OBJECTIVE_OPTIONS = [
  "Reduce operational costs",
  "Automate manual processes",
  "Improve customer experience",
  "Modernize legacy systems",
  "Improve analytics",
  "Integrate disconnected systems",
  "Scale operations",
  "Improve employee productivity",
  "Build a new digital product",
  "Improve compliance",
  "Other",
] as const

export const companyContextSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required.").max(160),
  companyWebsite: z.string().trim().max(2_048).optional().or(z.literal("")),
  industry: z.string().trim().min(1, "Industry is required.").max(120),
  companySize: z.string().trim().min(1, "Company size is required.").max(80),
  userRole: z.string().trim().min(1, "Your role in the company is required.").max(120),
  currentTools: z.array(z.string().trim().min(1).max(80)).min(1, "Select at least one current tool or system.").max(20),
  businessObjective: z.string().trim().min(1, "Business objective is required.").max(160),
  objectiveClarification: z.string().trim().max(1_000).optional().or(z.literal("")),
})

export type CompanyContextInput = z.infer<typeof companyContextSchema>

export function normalizeCompanyContext(input: CompanyContextInput): CompanyContextInput {
  return {
    ...input,
    companyWebsite: input.companyWebsite?.trim() || undefined,
    currentTools: Array.from(new Set(input.currentTools.map((tool) => tool.trim()).filter(Boolean))),
    objectiveClarification: input.objectiveClarification?.trim() || undefined,
  }
}

export function formatCompanyContext(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return ""
  const context = value as Record<string, unknown>
  const lines = [
    "Company Context (explicit intake):",
    typeof context.companyName === "string" && context.companyName.trim() ? `Company Name: ${context.companyName.trim()}` : "",
    typeof context.companyWebsite === "string" && context.companyWebsite.trim() ? `Company Website: ${context.companyWebsite.trim()}` : "",
    typeof context.industry === "string" && context.industry.trim() ? `Industry: ${context.industry.trim()}` : "",
    typeof context.companySize === "string" && context.companySize.trim() ? `Company Size: ${context.companySize.trim()}` : "",
    Array.isArray(context.currentTools) && context.currentTools.length ? `Current Tools / Systems: ${context.currentTools.map(String).join(", ")}` : "",
    typeof context.businessObjective === "string" && context.businessObjective.trim() ? `Primary Business Objective: ${context.businessObjective.trim()}` : "",
    typeof context.objectiveClarification === "string" && context.objectiveClarification.trim() ? `Objective clarification: ${context.objectiveClarification.trim()}` : "",
  ].filter(Boolean)
  return lines.join("\n")
}
