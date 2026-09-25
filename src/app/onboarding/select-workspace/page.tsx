"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Layers,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UserOrg {
  id: string
  name: string
  slug: string
  role: string
  workspaceId: string | null
  workspaceName: string | null
  isActive: boolean
}

export default function SelectWorkspacePage() {
  const router = useRouter()
  const { status, update } = useSession()

  const [organizations, setOrganizations] = useState<UserOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadUserOrgs() {
      try {
        setLoading(true)
        const res = await fetch("/api/organization/me")
        const data = await res.json().catch(() => ({}))

        if (!isMounted) return

        if (res.ok && data.ok) {
          setOrganizations(data.organizations || [])

          // If user belongs to 0 organizations, send to onboarding
          if (data.membershipCount === 0) {
            router.replace("/onboarding/company")
            return
          }

          // If user belongs to exactly 1 organization, send directly to dashboard
          if (data.membershipCount === 1) {
            router.replace("/dashboard")
            return
          }
        } else {
          setError(data.error || "Unable to load your company workspaces.")
        }
      } catch {
        if (isMounted) {
          setError("Failed to connect to workspace service. Please try again.")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadUserOrgs()

    return () => {
      isMounted = false
    }
  }, [router])

  async function handleSwitchWorkspace(org: UserOrg) {
    if (switchingId) return
    setError(null)
    setSwitchingId(org.id)

    try {
      const res = await fetch("/api/organization/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: org.id }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.error || "Unable to switch workspace.")
        setSwitchingId(null)
        return
      }

      if (update) {
        try {
          await update({ organizationId: org.id })
        } catch {
          // Non-critical session refresh
        }
      }

      setSuccessMessage(`Switched to ${org.name}. Opening dashboard...`)
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 700)
    } catch {
      setError("Failed to switch workspace. Please try again.")
      setSwitchingId(null)
    }
  }

  if (status === "unauthenticated") {
    router.replace("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
            <Layers className="h-3.5 w-3.5 text-[#F472B6]" />
            Workspace Switcher
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
            Choose your workspace
          </h1>
          <p className="text-sm text-neutral-600 max-w-md mx-auto">
            You are a member of multiple companies. Choose which organization workspace to open.
          </p>
        </div>

        {/* Success feedback */}
        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-[#F1F8EC] p-4 text-sm text-emerald-900 shadow-xs animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error feedback */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 shadow-xs animate-in fade-in">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-500 font-medium">Loading your workspaces...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => {
              const isSwitching = switchingId === org.id

              return (
                <Card
                  key={org.id}
                  className={`border transition-all duration-200 ${
                    org.isActive
                      ? "border-neutral-900 bg-neutral-50 shadow-sm"
                      : "border-[#E5DFD4] bg-white hover:border-neutral-400"
                  }`}
                >
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-neutral-900">{org.name}</h3>
                        {org.isActive && (
                          <Badge className="bg-neutral-900 text-white text-[10px] font-bold">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {org.workspaceName || `${org.name} Workspace`} &bull; Role: {org.role}
                      </p>
                    </div>

                    <div>
                      <Button
                        type="button"
                        disabled={Boolean(switchingId) || Boolean(successMessage)}
                        onClick={() => handleSwitchWorkspace(org)}
                        className="rounded-full h-9 px-4 text-xs font-semibold bg-[#18181C] hover:bg-neutral-800 text-white"
                      >
                        {isSwitching ? (
                          <>
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Entering...
                          </>
                        ) : (
                          <>
                            Enter Workspace
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            <div className="pt-2">
              <Button
                asChild
                variant="outline"
                className="w-full rounded-2xl border-dashed border-[#C5BFB4] hover:bg-neutral-100 text-neutral-700 h-12 text-xs font-semibold"
              >
                <Link href="/onboarding/company">
                  <Plus className="mr-2 h-4 w-4" />
                  Join another demo company
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
