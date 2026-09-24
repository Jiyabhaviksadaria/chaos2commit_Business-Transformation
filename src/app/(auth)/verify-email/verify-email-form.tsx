"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function VerifyEmailForm({ initialToken }: { initialToken: string }) {
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle")

  useEffect(() => {
    if (!initialToken) { setStatus("error"); setMessage("This verification link is missing its token."); return }
    let active = true
    setStatus("verifying")
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(initialToken)}`)
      .then(async (response) => { const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || "This verification link is invalid or has expired."); return result })
      .then((result) => { if (active) { setStatus("success"); setMessage(result.message || "Your email address has been verified.") } })
      .catch((error) => { if (active) { setStatus("error"); setMessage(error instanceof Error ? error.message : "Unable to verify your email.") } })
    return () => { active = false }
  }, [initialToken])

  async function resend() {
    setResendState("sending")
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to resend verification")
      setResendState("sent")
    } catch { setResendState("idle") }
  }

  return <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Email verification</CardTitle><CardDescription>Confirm your email address to activate your account.</CardDescription></CardHeader><CardContent className="space-y-4">{status === "verifying" && <p className="rounded-2xl bg-[#FAF8F2] p-4 text-sm text-neutral-700">Verifying your email...</p>}{status === "success" && <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-sm text-neutral-800">{message}</div>}{status === "error" && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{message}</div>}{status === "error" && <div className="space-y-2"><Label htmlFor="resend-email">Need a new link?</Label><div className="flex gap-2"><Input id="resend-email" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /><Button type="button" variant="outline" onClick={resend} disabled={resendState === "sending" || !email}>{resendState === "sending" ? "Sending" : "Resend"}</Button></div>{resendState === "sent" && <p className="text-xs text-neutral-600">If the account exists, a fresh link has been sent.</p>}</div>}</CardContent><CardFooter><Link href="/login" className="w-full text-center text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline">Continue to sign in</Link></CardFooter></Card>
}
