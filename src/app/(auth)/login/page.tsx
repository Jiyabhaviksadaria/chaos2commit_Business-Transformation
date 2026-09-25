"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [showUnverifiedHelp, setShowUnverifiedHelp] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const justSignedOut = searchParams.get("signedOut") === "1"
  const passwordResetSuccess = searchParams.get("passwordReset") === "1"

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace(callbackUrl)
    }
  }, [status, session, router, callbackUrl])

  async function onSubmit(data: LoginFormValues) {
    setError(null)
    setShowUnverifiedHelp(false)
    setLoginEmail(data.email)

    const result = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    })

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED" || result.error?.includes("not verified")) {
        setShowUnverifiedHelp(true)
        setError("Your email address has not been verified yet.")
      } else {
        setError("Invalid email or password. Please try again.")
      }
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  async function onDemoMode() {
    setDemoError(null)
    setDemoLoading(true)
    try {
      const result = await signIn("demo", { redirect: false, callbackUrl: "/dashboard" })
      if (!result || result.error) {
        setDemoError("Demo Mode could not be started. Please try again.")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } catch {
      setDemoError("Demo Mode could not be started. Please try again.")
    } finally {
      setDemoLoading(false)
    }
  }

  // While checking session status, show a neutral loading state
  if (status === "loading") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </CardContent>
      </Card>
    )
  }

  // Already authenticated — redirecting
  if (status === "authenticated") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting…
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Welcome Back
        </CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {/* Sign-out confirmation banner */}
          {justSignedOut && !error && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>You&apos;ve been signed out successfully.</span>
            </div>
          )}

          {/* Password reset success banner */}
          {passwordResetSuccess && !error && (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Password reset successfully. Sign in with your new password.</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <p>{error}</p>
              {showUnverifiedHelp && (
                <p className="mt-1">
                  <Link
                    href={`/resend-verification${loginEmail ? `?email=${encodeURIComponent(loginEmail)}` : ""}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Resend verification email →
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800 transition-all font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign In"
            )}
          </Button>

          <div className="flex items-center gap-3 py-1"><div className="h-px flex-1 bg-[#E5DFD4]" /><span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-neutral-400">OR</span><div className="h-px flex-1 bg-[#E5DFD4]" /></div>
          <div className="rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-4 text-center">
            <Button type="button" onClick={onDemoMode} disabled={demoLoading} className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800 transition-all text-xs font-bold">
              {demoLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing Demo Workspace...</> : <><Sparkles className="h-4 w-4 text-[#FEE895]" /> Continue with Demo</>}
            </Button>
            <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-400">No email • No password • Instant access</p>
            {demoError && <p className="mt-3 text-xs font-semibold text-red-600" role="alert">{demoError}</p>}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-neutral-900 underline-offset-2 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
