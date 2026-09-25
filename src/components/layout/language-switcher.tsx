"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setLocaleCookie } from "@/app/actions/locale"

const LOCALES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
]

export function LanguageSwitcher({ currentLocale = "en" }: { currentLocale?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const activeLocale = LOCALES.find((locale) => locale.code === currentLocale) || LOCALES[0]

  const handleLocaleChange = (locale: string) => {
    startTransition(async () => {
      await setLocaleCookie(locale)
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isPending} className="h-9 gap-1.5 rounded-full border-[#E5DFD4] bg-white px-2.5 text-xs font-bold text-neutral-800 shadow-sm hover:bg-[#FAF8F2]">
          <Globe className="h-3.5 w-3.5 text-neutral-600" />
          <span className="hidden sm:inline">{activeLocale.nativeName}</span>
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
            className="flex items-center justify-between text-xs"
          >
            <span>{locale.nativeName} <span className="text-neutral-400">({locale.name})</span></span>
            {currentLocale === locale.code && <Check className="ml-2 h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
