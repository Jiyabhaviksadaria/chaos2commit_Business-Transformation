"use client"

import * as React from "react"
import { Search, Bell, Settings, User, Menu, Zap } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Topbar({ locale }: { locale: string }) {
  const { data: session } = useSession()
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between px-6 bg-[#F7F4EB]">
      {/* Mobile Sidebar Trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="sm:hidden text-neutral-800">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side={locale === "ar" ? "right" : "left"} className="sm:max-w-xs p-0 bg-transparent border-none">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="flex items-center gap-2 bg-[#FAF8F2] border border-[#E6E0D2] rounded-full px-3 py-1.5 shadow-sm">
          <div className="bg-[#F472B6] text-white p-1.5 rounded-full flex items-center justify-center shrink-0">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search projects, deliverables, specs..."
            className="w-28 sm:w-40 bg-transparent text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none"
          />
          <div className="hidden md:flex items-center gap-1 text-[11px] text-neutral-500 ml-auto border-l border-[#E6E0D2] pl-2">
            <span>In:</span>
            <span className="bg-[#EFEAE0] hover:bg-[#E5DFD4] text-neutral-700 px-2 py-0.5 rounded-full cursor-pointer transition-colors">Projects</span>
            <span className="bg-[#EFEAE0] hover:bg-[#E5DFD4] text-neutral-700 px-2 py-0.5 rounded-full cursor-pointer transition-colors">Specs</span>
            <span className="bg-[#EFEAE0] hover:bg-[#E5DFD4] text-neutral-700 px-2 py-0.5 rounded-full cursor-pointer transition-colors">Deliverables</span>
          </div>
        </div>
      </div>

      {/* Right Actions & Pay-Per-Generation Credit Balance Badge */}
      <div className="flex items-center gap-2">
        {session?.user?.isDemo && <details className="relative"><summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-[#FEE895] bg-[#FEE895] px-3 py-1.5 text-[10px] font-extrabold tracking-wider text-neutral-900 shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />DEMO MODE</summary><div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-[#E5DFD4] bg-white p-3 text-xs shadow-xl"><p className="font-extrabold text-neutral-900">Demo Account</p><p className="mt-1 leading-relaxed text-neutral-600">You&apos;re exploring Intelly using a demonstration account. All business data shown in this workspace is illustrative demo data.</p></div></details>}

        {/* Credit Monetization Badge */}
        <Link href="/app/billing">
          <button className="flex items-center gap-1.5 bg-[#FEE895] hover:bg-yellow-300 text-neutral-900 border border-amber-300 text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm transition-all">
            <Zap className="h-3.5 w-3.5 fill-current text-amber-600" />
            <span>30 Credits</span>
          </button>
        </Link>

        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-[#18181C] text-white hover:bg-neutral-800 transition-all">
          <Bell className="h-4 w-4" />
        </Button>
        
        <Link href="/admin">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-[#18181C] text-white hover:bg-neutral-800 transition-all">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-[#18181C] text-white hover:bg-neutral-800 transition-all">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl p-2 bg-[#FAF8F2] shadow-xl border border-[#E5DFD4]">
            <DropdownMenuLabel className="font-semibold text-xs">{session?.user?.name || "Demo User"}{session?.user?.companyRole ? <span className="mt-1 block text-[10px] font-normal text-muted-foreground">Role in company: {session.user.companyRole}</span> : null}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/admin" className="text-xs">Platform Settings</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/app/billing" className="text-xs">Credits & Billing Plan</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login?signedOut=1" })} className="text-xs text-red-600">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
