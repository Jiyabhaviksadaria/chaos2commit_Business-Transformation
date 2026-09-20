"use server"

import { cookies } from "next/headers"

export async function setLocaleCookie(locale: string) {
  cookies().set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  })
}
