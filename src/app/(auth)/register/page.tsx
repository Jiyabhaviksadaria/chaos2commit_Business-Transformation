"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COMPANY_ROLE_OPTIONS, isCompanyRoleOption } from "@/lib/auth-roles"

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Invalid email address").max(320),
  role: z.string().trim().min(1, "Please select your role in the company.").max(100),
  customRole: z.string().trim().max(100, "Please enter a role under 100 characters.").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(1, "Confirm your password").max(128),
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

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [autoVerified, setAutoVerified] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "", customRole: "" },
  })
  const selectedRole = watch("role")

  async function onSubmit(data: RegisterFormValues) {
    setError(null)
    setResendMessage(null)
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) { setError(result.error?.message || "Registration failed"); return }
      setRegisteredEmail(data.email)
      setEmailSent(Boolean(result.emailSent))
      setAutoVerified(Boolean(result.autoVerified))
    } catch { setError("An unexpected error occurred") }
  }

  async function resendVerification() {
    if (!registeredEmail) return
    setResending(true)
    setResendMessage(null)
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: registeredEmail }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to resend verification email")
      setEmailSent(true)
      setResendMessage("If the account exists, a fresh verification link is on its way.")
    } catch (resendError) { setResendMessage(resendError instanceof Error ? resendError.message : "Unable to resend verification email") }
    finally { setResending(false) }
  }

  if (registeredEmail) {
    if (autoVerified || !emailSent) {
      return (
        <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Account Ready!</CardTitle>
            <CardDescription>Your account has been created successfully.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-sm text-neutral-800">
              Account created for <strong>{registeredEmail}</strong>. SMTP email delivery is currently disabled on this server, so your account has been <strong>automatically verified</strong> for immediate access.
            </div>
            <Button asChild className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800">
              <Link href="/login">Sign In to Your Account</Link>
            </Button>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Check your email</CardTitle>
          <CardDescription>Verify your account to activate Intelly AI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-sm text-neutral-800">
            We sent a verification link to <strong>{registeredEmail}</strong>. The link expires in 24 hours.
          </div>
          <Button type="button" variant="outline" className="w-full rounded-full border-[#E5DFD4]" onClick={resendVerification} disabled={resending}>
            {resending ? "Sending..." : "Resend verification email"}
          </Button>
          {resendMessage && <p className="text-center text-sm text-neutral-600">{resendMessage}</p>}
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full text-center text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Create your account</CardTitle><CardDescription>Start with your work email. No business description is required.</CardDescription></CardHeader><form onSubmit={handleSubmit(onSubmit)}><CardContent className="space-y-4">{error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}<div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" autoComplete="name" {...register("name")} />{errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}</div><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" {...register("email")} />{errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}</div><div className="space-y-2"><Label htmlFor="role">Role in Company</Label><Select value={selectedRole || undefined} onValueChange={(value) => setValue("role", value, { shouldDirty: true, shouldValidate: true })}><SelectTrigger id="role" aria-label="Role in Company"><SelectValue placeholder="Select your role" /></SelectTrigger><SelectContent>{COMPANY_ROLE_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}{selectedRole === "Other" && <div className="space-y-2 pt-2"><Label htmlFor="customRole">Custom role</Label><Input id="customRole" autoComplete="organization-title" placeholder="Enter your role" {...register("customRole")} />{errors.customRole && <p className="text-sm text-red-500">{errors.customRole.message}</p>}</div>}</div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" {...register("password")} /><p className="text-xs text-neutral-500">Use at least 8 characters.</p>{errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}</div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />{errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}</div></CardContent><CardFooter className="flex flex-col space-y-4"><Button type="submit" className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create Account"}</Button><div className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-semibold text-neutral-900 underline-offset-2 hover:underline">Log in</Link></div></CardFooter></form></Card>
}
