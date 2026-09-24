"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true); setError(null); setMessage(null)
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to process the request")
      setMessage(result.message || "If an unverified account exists, a new link has been sent.")
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to process the request") }
    finally { setLoading(false) }
  }

  return <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Resend verification</CardTitle><CardDescription>We&apos;ll send a fresh verification link to your account email.</CardDescription></CardHeader><form onSubmit={onSubmit}><CardContent className="space-y-4">{error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}{message && <div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-sm text-neutral-800">{message}</div>}<div className="space-y-2"><Label htmlFor="email">Account email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></CardContent><CardFooter className="flex flex-col space-y-4"><Button type="submit" className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800" disabled={loading}>{loading ? "Sending..." : "Send verification link"}</Button><Link href="/login" className="text-center text-sm text-neutral-600 underline-offset-2 hover:underline">Back to sign in</Link></CardFooter></form></Card>
}
