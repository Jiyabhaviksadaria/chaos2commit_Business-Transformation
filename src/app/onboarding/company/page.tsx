"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import {
  Building2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CompanyItem {
  id: string
  slug: string
  name: string
  industry: string
  description: string
  workspaceId: string | null
  workspaceName: string | null
  memberCount: number
  isMember: boolean
}

export default function OnboardingCompanyPage() {
  const router = useRouter()
  const { status, update } = useSession()

  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectingSlug, setSelectingSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [userMembershipCount, setUserMembershipCount] = useState<number>(0)

  useEffect(() => {
    let isMounted = true

    async function loadCompanies() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/onboarding/companies")
        const data = await res.json().catch(() => ({}))

        if (!isMounted) return

        if (res.ok && data.ok) {
          setCompanies(data.companies || [])
          setUserMembershipCount(data.membershipCount || 0)

          // If the user already has exactly one company membership and isn't specifically choosing to switch
          if (data.membershipCount === 1) {
            const memberCompany = (data.companies as CompanyItem[]).find((c) => c.isMember)
            if (memberCompany) {
              setSuccessMessage(`You're already a member of ${memberCompany.name}. Taking you to your dashboard...`)
              setTimeout(() => {
                router.replace("/dashboard")
              }, 1200)
              return
            }
          }
        } else {
          setError(data.error || "Unable to load the list of companies. Please refresh.")
        }
      } catch {
        if (isMounted) {
          setError("We couldn't connect you to the company service. Please check your connection and try again.")
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadCompanies()

    return () => {
      isMounted = false
    }
  }, [router])

  async function handleSelectCompany(company: CompanyItem) {
    if (selectingSlug) return
    setError(null)
    setSelectingSlug(company.slug)

    try {
      const res = await fetch("/api/onboarding/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, slug: company.slug }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.error || "We couldn't connect you to this company. Please try again.")
        setSelectingSlug(null)
        return
      }

      // Update local session with new organization
      if (update) {
        try {
          await update({ organizationId: data.organizationId })
        } catch {
          // Non-critical session update failure
        }
      }

      setSuccessMessage(
        data.alreadyMember
          ? `You're already a member of ${company.name}. Entering workspace...`
          : `Joined ${company.name} successfully! Entering workspace...`
      )

      setTimeout(() => {
        router.push(data.redirectUrl || "/dashboard")
        router.refresh()
      }, 800)
    } catch {
      setError("We couldn't connect you to this company. Please try again.")
      setSelectingSlug(null)
    }
  }

  // Not signed in state
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#E5DFD4] bg-white shadow-sm text-center">
          <CardHeader>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-center mb-2">
              <Building2 className="h-6 w-6 text-[#18181C]" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-neutral-900">Sign in to continue</CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Please sign in or complete email verification to select your company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full rounded-full bg-[#18181C] text-white hover:bg-neutral-800 h-11 text-sm font-semibold">
              <Link href="/login?callbackUrl=/onboarding/company">
                Go to Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-semibold text-neutral-700">
            <Sparkles className="h-3.5 w-3.5 text-[#F472B6]" />
            Intelly Multi-Tenant Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
            Choose your company
          </h1>
          <p className="text-sm text-neutral-600 max-w-lg mx-auto">
            Select the company you want to work with. Your workspace, projects, AI context, and Team Chat will be scoped to this company.
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

        {/* Company cards */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-500 font-medium">Loading companies...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companies.map((company) => {
              const isSelected = selectingSlug === company.slug
              const isCurrentMember = company.isMember

              return (
                <Card
                  key={company.id}
                  className={`border transition-all duration-200 ${
                    isCurrentMember
                      ? "border-emerald-300 bg-emerald-50/30 shadow-xs"
                      : isSelected
                      ? "border-neutral-900 bg-neutral-50 shadow-md ring-1 ring-neutral-900"
                      : "border-[#E5DFD4] bg-white hover:border-neutral-400 hover:shadow-sm"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
                            {company.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="bg-[#FAF8F5] border border-[#E8E4DC] text-neutral-700 text-[11px] font-semibold"
                          >
                            {company.industry}
                          </Badge>
                          {isCurrentMember && (
                            <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              Member
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 leading-relaxed max-w-xl">
                          {company.description}
                        </p>
                        <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {company.workspaceName || `${company.name} Workspace`}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {company.memberCount} {company.memberCount === 1 ? "member" : "members"}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 pt-2 sm:pt-0">
                        <Button
                          type="button"
                          disabled={Boolean(selectingSlug) || Boolean(successMessage)}
                          onClick={() => handleSelectCompany(company)}
                          className={`rounded-full h-10 px-5 text-xs font-semibold transition-all ${
                            isCurrentMember
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#18181C] hover:bg-neutral-800 text-white"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Joining {company.name}...
                            </>
                          ) : isCurrentMember ? (
                            <>
                              Enter Workspace
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Select Company
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Multiple workspace notice */}
        {userMembershipCount > 1 && (
          <div className="text-center pt-4">
            <Link
              href="/onboarding/select-workspace"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 underline underline-offset-4"
            >
              You belong to multiple companies. Switch workspace here →
            </Link>
          </div>
        )}

        <div className="text-center text-xs text-neutral-500 pt-6 border-t border-[#E5DFD4]">
          Need help? Intelly multi-tenant architecture keeps your data, projects, and messages completely isolated.
        </div>
      </div>
    </div>
  )
}
