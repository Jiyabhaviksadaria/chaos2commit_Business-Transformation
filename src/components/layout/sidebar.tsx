"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  FileText,
  Settings,
  CreditCard,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const t = useTranslations("Shell")

  const mainNavItems = [
    { title: t("dashboard"), href: "/app", icon: LayoutDashboard },
    { title: t("projects"), href: "/projects", icon: FolderKanban },
    { title: "AI Companion", href: "/app/ai", icon: Bot },
    { title: t("documents"), href: "/app/documents", icon: FileText },
    { title: "Credits & Billing", href: "/app/billing", icon: CreditCard },
  ]

  const adminNavItems = [
    { title: t("admin"), href: "/admin", icon: Settings },
  ]

  return (
    <div className={cn("pb-12 h-screen flex flex-col border-r bg-muted/40", className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">BT AI</h2>
          </div>
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all",
                  pathname === item.href || (item.href !== "/app" && pathname.startsWith(item.href))
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        </div>
        {session?.user.role === "PLATFORM_ADMIN" && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-sm font-semibold tracking-tight">
              Administration
            </h2>
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all",
                    pathname.startsWith(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
