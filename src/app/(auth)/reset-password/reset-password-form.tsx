"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const [token] = useState(initialToken)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }
    setLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password, confirmPassword }) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || "Unable to reset your password")
      setSuccess(true)
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to reset your password") }
    finally { setLoading(false) }
  }

  return <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm"><CardHeader><CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Choose a new password</CardTitle><CardDescription>Use a strong password you do not reuse elsewhere.</CardDescription></CardHeader>{success ? <><CardContent><div className="rounded-2xl border border-[#B8DF9E] bg-[#F1F8EC] p-4 text-sm text-neutral-800">Your password has been reset. You can now sign in with your new password.</div></CardContent><CardFooter><Link href="/login" className="w-full text-center text-sm font-semibold text-neutral-900 underline-offset-2 hover:underline">Continue to sign in</Link></CardFooter></> : <form onSubmit={onSubmit}><CardContent className="space-y-4">{error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}{!token && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">This reset link is missing its token. Request a new link from the forgot-password page.</div>}<div className="space-y-2"><Label htmlFor="password">New password</Label><Input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></div><div className="space-y-2"><Label htmlFor="confirmPassword">Confirm new password</Label><Input id="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} /></div></CardContent><CardFooter className="flex flex-col space-y-4"><Button type="submit" className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800" disabled={loading || !token}>{loading ? "Updating..." : "Update password"}</Button><Link href="/login" className="text-center text-sm text-neutral-600 underline-offset-2 hover:underline">Back to sign in</Link></CardFooter></form>}</Card>
}
