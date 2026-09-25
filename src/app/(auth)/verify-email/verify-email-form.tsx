"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type VerifyState =
  | "checking"
  | "ready"
  | "verifying"
  | "success"
  | "already_verified"
  | "expired"
  | "invalid"
  | "missing_token"

interface VerifyEmailFormProps {
  initialToken?: string
}

export function VerifyEmailForm({ initialToken = "" }: VerifyEmailFormProps) {
  const router = useRouter()
  const [token] = React.useState(initialToken.trim())
  const [state, setState] = React.useState<VerifyState>(() => (initialToken.trim() ? "checking" : "missing_token"))
  const [userEmail, setUserEmail] = React.useState("")
  const [userName, setUserName] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Resend state
  const [resendEmail, setResendEmail] = React.useState("")
  const [resending, setResending] = React.useState(false)
  const [resendFeedback, setResendFeedback] = React.useState<{ success: boolean; message: string } | null>(null)
  const [cooldown, setCooldown] = React.useState(0)

  // Auto-redirect countdown on success
  const [redirectCountdown, setRedirectCountdown] = React.useState(4)

  // Cooldown countdown effect
  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Step 1: On mount, safely inspect token validity via GET (never consumes the token)
  React.useEffect(() => {
    if (!token) {
      setState("missing_token")
      return
    }

    let isMounted = true

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json().catch(() => ({}))

        if (!isMounted) return

        if (data.email) {
          setUserEmail(data.email)
          setResendEmail(data.email)
        }
        if (data.name) {
          setUserName(data.name)
        }

        if (data.alreadyVerified) {
          setState("already_verified")
          return
        }

        if (res.ok && data.valid) {
          setState("ready")
          return
        }

        if (data.reason === "EXPIRED") {
          setState("expired")
          setErrorMessage(data.message || "This verification link has expired.")
          return
        }

        setState("invalid")
        setErrorMessage(data.message || "This verification link is invalid or has expired.")
      } catch {
        if (isMounted) {
          setState("invalid")
          setErrorMessage("Unable to verify link validity. Please check your connection.")
        }
      }
    }

    checkToken()
    return () => {
      isMounted = false
    }
  }, [token])

  // Step 2: Explicit human confirmation via POST
  const handleConfirmVerification = async () => {
    if (!token || state === "verifying") return

    try {
      setState("verifying")
      setErrorMessage(null)

      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json().catch(() => ({}))

      if (data.email) {
        setUserEmail(data.email)
      }

      if (res.ok && data.success) {
        if (data.alreadyVerified) {
          setState("already_verified")
        } else {
          setState("success")
        }
        return
      }

      // Handle errors
      if (data.reason === "EXPIRED") {
        setState("expired")
        setErrorMessage(data.error || "This verification link has expired.")
        return
      }

      if (data.reason === "ALREADY_USED" && data.alreadyVerified) {
        setState("already_verified")
        return
      }

      setState("invalid")
      setErrorMessage(data.error || "Unable to complete verification.")
    } catch {
      setState("invalid")
      setErrorMessage("A network error occurred. Please try again.")
    }
  }

  // Auto redirect effect on success
  React.useEffect(() => {
    if (state !== "success") return

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/login?verified=1${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [state, userEmail, router])

  // Resend verification handler
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resendEmail.trim()
    if (!targetEmail || resending || cooldown > 0) return

    try {
      setResending(true)
      setResendFeedback(null)

      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      })

      const data = await res.json().catch(() => ({}))

      if (data.alreadyVerified) {
        setState("already_verified")
        setUserEmail(targetEmail)
        return
      }

      if (res.ok && data.success) {
        setResendFeedback({
          success: true,
          message: data.message || "A fresh verification link has been sent to your email.",
        })
        setCooldown(data.cooldownSeconds || 60)
      } else {
        setResendFeedback({
          success: false,
          message: data.error || "Failed to resend verification email.",
        })
        if (data.retryAfterSeconds) {
          setCooldown(data.retryAfterSeconds)
        }
      }
    } catch {
      setResendFeedback({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setResending(false)
    }
  }

  // Render Resend Box
  const renderResendForm = (helperText?: string) => (
    <div className="space-y-3 pt-2">
      <div className="text-xs text-neutral-500">
        {helperText || "Need a new link? Enter your email address to receive a fresh verification email."}
      </div>

      <form onSubmit={handleResend} className="space-y-2">
        <div className="space-y-1.5">
          <Label htmlFor="resend-email" className="text-xs font-semibold text-neutral-700">
            Account Email
          </Label>
          <div className="flex gap-2">
            <Input
              id="resend-email"
              type="email"
              placeholder="you@company.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="text-sm rounded-xl border-[#E5DFD4] focus-visible:ring-1 focus-visible:ring-[#18181C]"
              required
              disabled={resending}
            />
            <Button
              type="submit"
              variant="outline"
              disabled={resending || cooldown > 0 || !resendEmail.trim()}
              className="rounded-xl border-[#E5DFD4] text-xs font-semibold shrink-0"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending
                </>
              ) : cooldown > 0 ? (
                `Wait ${cooldown}s`
              ) : (
                "Resend Link"
              )}
            </Button>
          </div>
        </div>
      </form>

      {resendFeedback && (
        <div
          className={`p-3 rounded-xl text-xs font-medium ${
            resendFeedback.success
              ? "bg-[#F1F8EC] text-neutral-800 border border-[#B8DF9E]"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {resendFeedback.message}
        </div>
      )}
    </div>
  )

  // 1. Checking / Loading State
  if (state === "checking") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-2 shadow-xs">
            <Loader2 className="h-6 w-6 animate-spin text-[#18181C]" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-neutral-900">
            Checking verification link
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Please wait while we validate your credentials…
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6 text-center text-xs text-neutral-400">
          Securing your session and workspace…
        </CardContent>
      </Card>
    )
  }

  // 2. Ready to Confirm State (Preferred Human Confirmation Step)
  if (state === "ready" || state === "verifying") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-2 shadow-xs">
            <ShieldCheck className="h-6 w-6 text-[#18181C]" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Verify your Intelly account
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            You&apos;re one step away from accessing your transformation workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {userEmail && (
            <div className="rounded-2xl border border-[#E8E4DC] bg-[#FAF8F5] p-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
                Confirming email address
              </div>
              <div className="text-sm font-bold text-neutral-900 truncate">
                {userEmail}
              </div>
              {userName && (
                <div className="text-xs text-neutral-500 mt-0.5">
                  Welcome, {userName}!
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-neutral-600 text-center leading-relaxed">
            Click the button below to confirm your email and activate your account.
          </p>

          <Button
            onClick={handleConfirmVerification}
            disabled={state === "verifying"}
            className="w-full rounded-full bg-[#18181C] text-white hover:bg-black transition-all font-semibold h-11 text-sm shadow-xs"
          >
            {state === "verifying" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying your account…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue verification
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </CardContent>

        <CardFooter className="pt-2">
          <Link
            href="/login"
            className="w-full text-center text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // 3. Success State
  if (state === "success") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#F1F8EC] border border-[#B8DF9E] flex items-center justify-center mb-2 shadow-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Email verified!
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Your Intelly account is verified and ready.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-center">
            <div className="text-sm font-semibold text-neutral-900 mb-1">
              Account activated successfully
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your email address has been verified. Redirecting you to sign in in{" "}
              <strong className="text-neutral-900 font-bold">{redirectCountdown}s</strong>…
            </p>
          </div>

          <Button
            asChild
            className="w-full rounded-full bg-[#18181C] text-white hover:bg-black transition-all font-semibold h-11 text-sm shadow-xs"
          >
            <Link
              href={`/login?verified=1${
                userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""
              }`}
            >
              Continue to Intelly
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 4. Already Verified State
  if (state === "already_verified") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#F1F8EC] border border-[#B8DF9E] flex items-center justify-center mb-2 shadow-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Already verified
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Your email is already verified.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-center">
            <p className="text-xs text-neutral-700 leading-relaxed">
              This account has already been verified. You can sign in directly to access your transformation workspace.
            </p>
          </div>

          <Button
            asChild
            className="w-full rounded-full bg-[#18181C] text-white hover:bg-black transition-all font-semibold h-11 text-sm shadow-xs"
          >
            <Link
              href={`/login?verified=1${
                userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""
              }`}
            >
              Continue to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 5. Expired Token State
  if (state === "expired") {
    return (
      <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-2 shadow-xs">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Link expired
          </CardTitle>
          <CardDescription className="text-xs text-neutral-500">
            Verification links expire after 24 hours.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs text-amber-900 text-center leading-relaxed">
            {errorMessage || "This verification link has expired. Request a new link below to activate your account."}
          </div>

          {renderResendForm()}
        </CardContent>

        <CardFooter className="pt-2">
          <Link
            href="/login"
            className="w-full text-center text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
          >
            Continue to sign in
          </Link>
        </CardFooter>
      </Card>
    )
  }

  // 6. Invalid / Missing Token State
  return (
    <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-2 shadow-xs">
          <AlertCircle className="h-6 w-6 text-rose-600" />
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Invalid verification link
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          This verification link is no longer valid.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 text-center leading-relaxed">
          {errorMessage || "This link may have been replaced by a newer request, or the token was incomplete. Request a fresh link below."}
        </div>

        {renderResendForm("Enter your email below to receive a new link.")}
      </CardContent>

      <CardFooter className="pt-2">
        <Link
          href="/login"
          className="w-full text-center text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
        >
          Continue to sign in
        </Link>
      </CardFooter>
    </Card>
  )
}
