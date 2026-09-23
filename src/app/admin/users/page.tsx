"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, ArrowLeft, Mail, Building2, Loader2, RefreshCw } from "lucide-react"

interface UserItem {
  id: string
  name?: string
  email: string
  role: string
  createdAt: string
  memberships?: any[]
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState<boolean>(true)
  const [users, setUsers] = useState<UserItem[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (res.ok && data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans bg-[#F7F4EB] min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5DFD4] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <button className="h-9 w-9 rounded-full bg-white border border-[#E5DFD4] flex items-center justify-center hover:bg-neutral-100 transition-all text-neutral-700 shadow-xs">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">User Governance & Role Management</h1>
              <span className="bg-[#FEE895] text-neutral-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                RBAC Directory
              </span>
            </div>
            <p className="text-xs text-neutral-500">Manage user accounts, platform roles, organization access, and permissions.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchUsers} className="bg-white border-[#E5DFD4] text-xs gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
        </Button>
      </div>

      {/* Directory Content */}
      <Card className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] shadow-xs">
        <CardHeader className="py-3 px-5 border-b border-[#E5DFD4] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-neutral-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-800" /> Platform User Directory
            </CardTitle>
            <CardDescription className="text-[11px] text-neutral-500">Showing {users.length} active registered workspace users.</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-neutral-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading user accounts...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">No user accounts found.</div>
          ) : (
            <div className="divide-y divide-[#E5DFD4]">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/50 transition-colors">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-neutral-900">{u.name || "Workspace User"}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-neutral-500">
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-neutral-400" />
                        <span>{u.email}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-neutral-400" />
                        <span>{u.memberships?.[0]?.organization?.name || "Global Workspace"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] bg-white border-[#E5DFD4] text-neutral-800 font-extrabold">
                      {u.role}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                      ACTIVE
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
