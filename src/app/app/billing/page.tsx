"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Zap, CreditCard, TrendingUp } from "lucide-react"
import { toast } from "sonner"

type Transaction = { id: string; amount: number; reason: string; balanceAfter: number; createdAt: string }
type OrgInfo = { creditBalance: number; plan: string; name: string }

export default function BillingPage() {
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topping, setTopping] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/info")
      if (res.ok) {
        const d = await res.json()
        setOrg(d.org)
        setTransactions(d.transactions ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const topUp = async () => {
    setTopping(true)
    try {
      const res = await fetch("/api/billing/topup", { method: "POST" })
      const d = await res.json()
      if (!d.ok) throw new Error(d.error)
      toast.success("50 credits added! (Demo mode)")
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Top-up failed")
    } finally {
      setTopping(false)
    }
  }

  const plans = [
    { name: "FREE", credits: 30, maxSystems: 2, price: "$0", color: "secondary" as const },
    { name: "PRO", credits: 500, maxSystems: 8, price: "$49/mo", color: "default" as const },
    { name: "ENTERPRISE", credits: 5000, maxSystems: "Unlimited", price: "$199/mo", color: "outline" as const }
  ]

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Credits</h1>
        <p className="text-muted-foreground mt-1">Demo mode — no real payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{org?.creditBalance ?? 0}</p>
                <p className="text-xs text-muted-foreground">Credits remaining</p>
              </div>
            </div>
            <Button className="w-full mt-3 gap-2" onClick={topUp} disabled={topping}>
              {topping ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Add 50 credits (Demo)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">{org?.plan ?? "FREE"}</p>
                <p className="text-xs text-muted-foreground">Current plan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Demo Mode</p>
            <p className="text-xs text-muted-foreground">No real payments are processed. Credits are for demonstration purposes only.</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Costs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Credit Costs</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {[
              ["Intake Analysis", "1 credit"],
              ["Build Systems", "5 credits"],
              ["Modify / Regenerate", "2 credits"],
              ["Consulting Module", "1 credit"],
              ["Export", "Free"],
              ["Chat", "Free"]
            ].map(([label, cost]) => (
              <div key={label} className="flex items-center justify-between p-2 bg-muted/40 rounded">
                <span className="text-muted-foreground">{label}</span>
                <Badge variant="outline">{cost}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader><CardTitle className="text-base">Plans</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(p => (
              <div key={p.name} className={`p-4 rounded-lg border ${org?.plan === p.name ? "border-primary bg-primary/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{p.name}</span>
                  {org?.plan === p.name && <Badge variant="default" className="text-xs">Current</Badge>}
                </div>
                <p className="text-2xl font-bold mb-3">{p.price}</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>{p.credits} credits</li>
                  <li>{typeof p.maxSystems === "number" ? `Max ${p.maxSystems} systems` : "Unlimited systems"}</li>
                </ul>
                {org?.plan !== p.name && (
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => toast.info("Plan switching is demo-only")}>
                    Switch (Demo)
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>{transactions.length} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.reason}</TableCell>
                    <TableCell>
                      <span className={t.amount > 0 ? "text-green-600" : "text-red-600"}>
                        {t.amount > 0 ? "+" : ""}{t.amount}
                      </span>
                    </TableCell>
                    <TableCell>{t.balanceAfter}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
