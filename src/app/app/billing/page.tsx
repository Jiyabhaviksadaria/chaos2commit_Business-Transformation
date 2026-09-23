"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Zap, CreditCard, TrendingUp, ArrowLeft, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

type Transaction = { id: string; amount: number; reason: string; balanceAfter: number; createdAt: string }
type OrgInfo = { creditBalance: number; plan: string; name: string }

export default function BillingPage() {
  const [org, setOrg] = useState<OrgInfo | null>({ creditBalance: 30, plan: "FREE", name: "Demo Org" })
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "tx-1", amount: 30, reason: "Welcome Initial Credits", balanceAfter: 30, createdAt: new Date().toISOString() }
  ])
  const [topping, setTopping] = useState(false)

  const topUp = async () => {
    setTopping(true)
    setTimeout(() => {
      setOrg(prev => prev ? { ...prev, creditBalance: prev.creditBalance + 50 } : null)
      setTransactions(prev => [
        { id: `tx-${Date.now()}`, amount: 50, reason: "Demo Credit Top-Up (+50)", balanceAfter: (org?.creditBalance || 0) + 50, createdAt: new Date().toISOString() },
        ...prev
      ])
      toast.success("50 credits added to your workspace!")
      setTopping(false)
    }, 600)
  }

  const plans = [
    { name: "FREE", credits: 30, maxSystems: 2, price: "$0", bg: "bg-white", border: "border-[#E5DFD4]" },
    { name: "PRO", credits: 500, maxSystems: 8, price: "$49/mo", bg: "bg-[#FEE895]", border: "border-amber-300" },
    { name: "ENTERPRISE", credits: 5000, maxSystems: "Unlimited", price: "$199/mo", bg: "bg-[#F8B4D9]", border: "border-pink-300" }
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 font-sans bg-[#F7F4EB] min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-sm">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Credits & Pay-Per-Generation Billing</h1>
              <span className="bg-[#F8B4D9] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Monetization Engine
              </span>
            </div>
            <p className="text-xs text-neutral-500">Manage transformation credits, system build limits, and tier plans.</p>
          </div>
        </div>

        <Link href="/projects">
          <button className="flex items-center gap-2 bg-[#18181C] text-white text-xs font-bold px-4 py-2 rounded-full shadow hover:bg-neutral-800 transition-all">
            <span>Return to Projects Dashboard</span>
          </button>
        </Link>
      </div>

      {/* Credit Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FEE895] rounded-[24px] p-5 text-neutral-900 shadow-sm border border-amber-300/50 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-neutral-900 fill-current" />
            </div>
            <div>
              <p className="text-3xl font-extrabold">{org?.creditBalance ?? 0}</p>
              <p className="text-xs font-bold text-neutral-700">Credits Available</p>
            </div>
          </div>
          <Button className="w-full mt-3 gap-2 bg-[#18181C] hover:bg-neutral-800 text-white rounded-full text-xs font-bold shadow" onClick={topUp} disabled={topping}>
            {topping ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4 text-[#F472B6]" />}
            Add +50 Demo Credits
          </Button>
        </div>

        <div className="bg-white rounded-[24px] p-5 text-neutral-900 shadow-sm border border-[#E5DFD4] flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FAF8F2] border border-[#E5DFD4] rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-neutral-700" />
            </div>
            <div>
              <p className="text-2xl font-extrabold">{org?.plan ?? "FREE"}</p>
              <p className="text-xs font-bold text-neutral-500">Active Monetization Plan</p>
            </div>
          </div>
          <p className="text-[11px] text-neutral-500 mt-3">Allows up to 2 workable system builds per workspace.</p>
        </div>

        <div className="bg-[#F8B4D9] rounded-[24px] p-5 text-neutral-900 shadow-sm border border-pink-300 flex flex-col justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-neutral-800 opacity-90">Pay-Per-Generation Rule</p>
            <p className="text-xs text-neutral-900 mt-2 font-medium leading-relaxed">
              Every deliverable spec costs 1 credit. System code builds cost 5 credits.
            </p>
          </div>
          <span className="text-[10px] font-extrabold bg-white/70 px-3 py-1 rounded-full text-neutral-900 w-fit mt-3">
            Transparent Credit Consumption
          </span>
        </div>
      </div>

      {/* Credit Rates Matrix */}
      <Card className="bg-[#FAF8F2] border-[#E5DFD4] rounded-[24px]">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-extrabold text-neutral-900">Credit Consumption Rate Matrix</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              ["AI Discovery Session", "1 credit"],
              ["System Code Build", "5 credits"],
              ["Regenerate Deliverable", "2 credits"],
              ["Architecture & ERD Specs", "1 credit"],
              ["PDF / Export Download", "Free"],
              ["AI Assistant Chat", "Free"]
            ].map(([label, cost]) => (
              <div key={label} className="flex items-center justify-between p-3 bg-white border border-[#E5DFD4] rounded-xl">
                <span className="font-bold text-neutral-800">{label}</span>
                <Badge className="bg-[#FEE895] text-neutral-900 font-extrabold border-none text-[10px]">{cost}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h3 className="text-sm font-extrabold text-neutral-900 mb-3">Subscription & Credit Tiers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.name} className={`p-5 rounded-[22px] border ${p.border} ${p.bg} shadow-sm space-y-3 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-neutral-900">{p.name} PLAN</span>
                  {org?.plan === p.name && <Badge className="bg-[#18181C] text-white text-[10px] font-extrabold">Current</Badge>}
                </div>
                <p className="text-3xl font-extrabold text-neutral-900">{p.price}</p>
                <ul className="space-y-2 text-xs text-neutral-700 font-medium mt-3">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-neutral-900" /> {p.credits} Monthly Transformation Credits</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-neutral-900" /> {typeof p.maxSystems === "number" ? `Max ${p.maxSystems} Workable Systems` : "Unlimited System Builds"}</li>
                </ul>
              </div>

              {org?.plan !== p.name && (
                <Button variant="outline" size="sm" className="w-full bg-white border-neutral-300 text-neutral-800 text-xs font-bold rounded-full" onClick={() => toast.info("Plan switching activated!")}>
                  Upgrade to {p.name}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History Ledger */}
      <Card className="bg-[#FAF8F2] border-[#E5DFD4] rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-extrabold text-neutral-900">Credit Transaction Audit Ledger</CardTitle>
          <CardDescription className="text-xs">{transactions.length} record(s) logged</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#E5DFD4]">
                <TableHead className="text-xs font-bold text-neutral-700">Transaction Reason</TableHead>
                <TableHead className="text-xs font-bold text-neutral-700">Amount</TableHead>
                <TableHead className="text-xs font-bold text-neutral-700">Balance After</TableHead>
                <TableHead className="text-xs font-bold text-neutral-700">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(t => (
                <TableRow key={t.id} className="border-[#E5DFD4]">
                  <TableCell className="text-xs font-bold text-neutral-900">{t.reason}</TableCell>
                  <TableCell className="text-xs font-bold">
                    <span className={t.amount > 0 ? "text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full" : "text-red-700 bg-red-100 px-2 py-0.5 rounded-full"}>
                      {t.amount > 0 ? "+" : ""}{t.amount} Credits
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-neutral-800">{t.balanceAfter}</TableCell>
                  <TableCell className="text-[11px] text-neutral-500">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
