"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, Mail, CheckCircle2, ArrowRight } from "lucide-react"
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

function ResendVerificationContent() {
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get("email") || ""

  const [email, setEmail] = React.useState(initialEmail)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [alreadyVerified, setAlreadyVerified] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [cooldown, setCooldown] = React.useState(0)

  // Countdown timer
  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || loading || cooldown > 0) return

    setLoading(true)
    setError(null)
    setMessage(null)
    setAlreadyVerified(false)

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const result = await response.json().catch(() => ({}))

      if (result.alreadyVerified) {
        setAlreadyVerified(true)
        setMessage(result.message || "Your email is already verified. Continue to sign in.")
        return
      }

      if (!response.ok) {
        if (result.rateLimited && result.retryAfterSeconds) {
          setCooldown(result.retryAfterSeconds)
        }
        throw new Error(result.error || "Unable to resend verification email.")
      }

      setMessage(
        result.message ||
          "If an unverified account exists, a fresh verification link has been sent. Check your inbox and spam folder."
      )
      setCooldown(result.cooldownSeconds || 60)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to process the request. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-2 shadow-xs">
          <Mail className="h-6 w-6 text-[#18181C]" />
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Resend verification
        </CardTitle>
        <CardDescription className="text-xs text-neutral-500">
          We&apos;ll send a fresh verification link to your account email.
        </CardDescription>
      </CardHeader>

      {alreadyVerified ? (
        <CardContent className="space-y-4 pt-2">
          <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-neutral-900 mb-1">
              Email already verified
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your account is already verified and ready to access.
            </p>
          </div>

          <Button
            asChild
            className="w-full rounded-full bg-[#18181C] text-white hover:bg-black transition-all font-semibold h-11 text-sm shadow-xs"
          >
            <Link href={`/login?email=${encodeURIComponent(email)}`}>
              Continue to Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      ) : (
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4 pt-2">
            {error && (
              <div
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-3.5 text-xs text-neutral-800 leading-relaxed">
                {message}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-neutral-700">
                Account Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="text-sm rounded-xl border-[#E5DFD4] focus-visible:ring-1 focus-visible:ring-[#18181C]"
                required
                disabled={loading}
              />
              <p className="text-[11px] text-neutral-400">
                Older verification links will no longer work once a new link is issued.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full rounded-full bg-[#18181C] text-white hover:bg-black transition-all font-semibold h-11 text-sm shadow-xs"
              disabled={loading || cooldown > 0 || !email.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending link…
                </span>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Send verification link"
              )}
            </Button>

            <Link
              href="/login"
              className="text-center text-xs font-semibold text-neutral-600 hover:text-black transition-colors"
            >
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}

export default function ResendVerificationPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </CardContent>
        </Card>
      }
    >
      <ResendVerificationContent />
    </React.Suspense>
  )
}
