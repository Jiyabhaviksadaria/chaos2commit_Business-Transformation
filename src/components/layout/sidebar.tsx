"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  FileText,
  Settings,
  CreditCard,
  LogOut,
  Sparkles,
  BarChart3,
  BookOpen,
  MessageSquare,
  Building2,
} from "lucide-react"

import { cn } from "@/lib/utils"

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  const generalItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Projects", href: "/projects", icon: FolderKanban },
    { title: "AI Assistant", href: "/app/ai", icon: Bot },
    { title: "Team Chat", href: "/app/team-chat", icon: MessageSquare },
    { title: "Analytics", href: "/app/analytics", icon: BarChart3 },
    { title: "Knowledge Base", href: "/app/documents", icon: BookOpen },
  ]

  const toolsItems = [
    { title: "Documents", href: "/app/documents", icon: FileText },
    { title: "Billing & Credits", href: "/app/billing", icon: CreditCard },
    { title: "Settings", href: "/admin", icon: Settings },
  ]

  return (
    <div className={cn("h-full py-3 pl-3 pr-1", className)}>
      <div className="h-[calc(100dvh-1.5rem)] w-full bg-[#18181C] text-white rounded-[28px] flex flex-col justify-between p-4 shadow-xl">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-2 pt-2 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-white font-sans">
                intelly
              </span>
            </div>
            <div className="h-6 w-6 rounded-full bg-[#F472B6] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* General Section */}
          <div className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
              General
            </p>
            {generalItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/app") ||
                (item.href !== "/app" && pathname !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#27272A] text-white font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-[#27272A]/50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-[#F472B6]" : "text-neutral-400")} />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>

          {/* Tools Section */}
          <div className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
              Tools
            </p>
            {toolsItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#27272A] text-white font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-[#27272A]/50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-[#F472B6]" : "text-neutral-400")} />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Footer / Switch Company & Log out */}
        <div className="pt-3 border-t border-neutral-800 space-y-1">
          <Link
            href="/onboarding/select-workspace"
            className="w-full flex items-center gap-3 rounded-full px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#27272A] transition-all"
          >
            <Building2 className="h-4 w-4 text-neutral-400" />
            <span>Switch Company</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })}
            className="w-full flex items-center gap-3 rounded-full px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-[#27272A] transition-all"
          >
            <LogOut className="h-4 w-4 text-neutral-400" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
