"use client"

import * as React from "react"
import { Menu, Bell, Building2 } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "./theme-toggle"
import { LanguageSwitcher } from "./language-switcher"
import { Sidebar } from "./sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const t = useTranslations("Shell")
  const [open, setOpen] = React.useState(false)

  const userInitials = session?.user?.name
    ? session.user.name.slice(0, 2).toUpperCase()
    : "US"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side={locale === "ar" ? "right" : "left"} className="sm:max-w-xs p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex h-14 items-center px-4 w-full justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 font-semibold">
            <Building2 className="h-5 w-5" />
            <span>{t("workspace")}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {/* Advisory banner for large screens */}
          <div className="hidden lg:flex items-center mr-4 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
            {t("disclaimer")}
          </div>

          <ThemeToggle />
          <LanguageSwitcher currentLocale={locale} />
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-600"></span>
            <span className="sr-only">Toggle notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ""} alt="User Avatar" />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{session?.user?.name || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>{t("admin")}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
