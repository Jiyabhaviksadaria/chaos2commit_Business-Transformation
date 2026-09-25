import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"
import { normalizeLocale } from "./locales"

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const locale = normalizeLocale(cookieStore.get("NEXT_LOCALE")?.value)

  try {
    return {
      locale,
      messages: (await import(`../messages/${locale}.json`)).default,
    }
  } catch {
    return {
      locale: "en",
      messages: (await import(`../messages/en.json`)).default,
    }
  }
})
