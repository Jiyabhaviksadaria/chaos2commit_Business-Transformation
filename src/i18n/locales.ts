export const APP_LOCALES = ["en", "hi", "gu"] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export type LocaleDefinition = {
  code: AppLocale
  englishName: string
  nativeName: string
  direction: "ltr" | "rtl"
  flag: string
  enabled: boolean
}

export const LOCALE_CONFIG: Record<AppLocale, LocaleDefinition> = {
  en: {
    code: "en",
    englishName: "English",
    nativeName: "English",
    direction: "ltr",
    flag: "🇺🇸",
    enabled: true,
  },
  hi: {
    code: "hi",
    englishName: "Hindi",
    nativeName: "हिन्दी",
    direction: "ltr",
    flag: "🇮🇳",
    enabled: true,
  },
  gu: {
    code: "gu",
    englishName: "Gujarati",
    nativeName: "ગુજરાતી",
    direction: "ltr",
    flag: "🇮🇳",
    enabled: true,
  },
}

export const ENABLED_LOCALES = APP_LOCALES.filter((locale) => LOCALE_CONFIG[locale].enabled)

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value)
}

export function normalizeLocale(value: unknown, fallback: AppLocale = "en"): AppLocale {
  if (typeof value !== "string") return fallback
  const normalized = value.trim().toLowerCase().split(/[-_]/)[0]
  return isAppLocale(normalized) ? normalized : fallback
}

export function getLocaleDefinition(value: unknown): LocaleDefinition {
  return LOCALE_CONFIG[normalizeLocale(value)]
}

export function getLocaleDirection(value: unknown): "ltr" | "rtl" {
  return getLocaleDefinition(value).direction
}

export function getNativeLocaleName(value: unknown): string {
  return getLocaleDefinition(value).nativeName
}
