"use server"

import { cookies } from "next/headers"
import { normalizeLocale } from "@/i18n/locales"

export async function setLocaleCookie(locale: string) {
  cookies().set("NEXT_LOCALE", normalizeLocale(locale), {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  })
}
