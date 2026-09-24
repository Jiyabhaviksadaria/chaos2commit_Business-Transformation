import { z } from "zod"
import { isCompanyRoleOption } from "@/lib/auth-roles"

const roleSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : ""),
  z.string().min(1, "Please select your role in the company.").max(100),
)

const customRoleSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : undefined),
  z.string().max(100, "Please enter a role under 100 characters.").optional(),
)

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Invalid email address").max(320),
  role: roleSchema,
  customRole: customRoleSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(1, "Please confirm your password.").max(128),
}).superRefine((value, ctx) => {
  if (!isCompanyRoleOption(value.role)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "Please select a valid role in the company." })
  }
  if (value.role === "Other" && !value.customRole) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customRole"], message: "Please enter your role in the company." })
  }
  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords do not match" })
  }
})
