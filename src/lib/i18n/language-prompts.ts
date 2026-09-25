import { LOCALE_CONFIG, normalizeLocale, type AppLocale } from "@/i18n/locales"

export function getLanguageInstruction(locale: string): string {
  const normalized = normalizeLocale(locale)
  const definition = LOCALE_CONFIG[normalized]
  return `Write user-facing content in ${definition.englishName} (${definition.nativeName}, locale ${definition.code}). Preserve brand and product names unless localization is explicitly requested.`
}

export function getWebsiteLanguageInstructions(primaryLanguage: string, supportedLanguages: string[]): string {
  const primary = normalizeLocale(primaryLanguage)
  const languages = Array.from(new Set([primary, ...supportedLanguages.map((locale) => normalizeLocale(locale))]))
  const lines = languages.map((locale) => {
    const definition = LOCALE_CONFIG[locale]
    return `- ${definition.englishName} (${definition.nativeName}, ${definition.code})${locale === primary ? " [PRIMARY]" : ""}`
  })
  return [
    "Generate localized website content for every requested locale.",
    `PRIMARY WEBSITE LANGUAGE: ${LOCALE_CONFIG[primary].englishName} (${LOCALE_CONFIG[primary].nativeName})`,
    "SUPPORTED WEBSITE LANGUAGES:",
    ...lines,
    "Return a structured JSON website spec with primaryLanguage, supportedLanguages, and localizedContent keyed by locale.",
    "Every requested locale must include navigation, hero, sections, CTAs, forms, testimonials, footer, and SEO content.",
    "Use natural grammar and the requested script; preserve brand/product names, URLs, email addresses, numbers, technical terms, and legal names unless context requires otherwise.",
    "Keep section IDs, order, visibility, and design/theme consistent across locales. Never mix languages within a locale.",
  ].join("\n")
}

export function getSupportedLanguageCodes(supportedLanguages: string[]): AppLocale[] {
  return Array.from(new Set(supportedLanguages.map((locale) => normalizeLocale(locale))))
}
