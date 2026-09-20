import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"

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
