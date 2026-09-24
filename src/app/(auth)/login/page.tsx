"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginFormValues) {
    setError(null)
    const result = await signIn("credentials", { redirect: false, email: data.email, password: data.password })
    if (result?.error) {
      setError("Invalid credentials or an unverified email address.")
    } else {
      router.push("/app")
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your transformation workspace.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error} <Link href="/resend-verification" className="font-semibold underline">Resend verification</Link></div>}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" {...register("email")} />{errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}</div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Password</Label><Link href="/forgot-password" className="text-xs font-semibold text-neutral-600 underline-offset-2 hover:underline">Forgot password?</Link></div><Input id="password" type="password" autoComplete="current-password" {...register("password")} />{errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}</div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Sign in"}</Button>
          <div className="text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/register" className="font-semibold text-neutral-900 underline-offset-2 hover:underline">Sign up</Link></div>
        </CardFooter>
      </form>
    </Card>
  )
}
