import { z } from "zod"

import { APP_LOCALES, LOCALE_CONFIG, isAppLocale, normalizeLocale, type AppLocale } from "@/i18n/locales"

export type WebsiteLanguageConfig = {
  primaryLanguage: AppLocale
  supportedLanguages: AppLocale[]
}

const localeCodeSchema = z.string().refine(isAppLocale, "Unsupported locale")

export const websiteLanguageConfigSchema = z.object({
  primaryLanguage: localeCodeSchema,
  supportedLanguages: z.array(localeCodeSchema).min(1),
}).superRefine((value, context) => {
  if (new Set(value.supportedLanguages).size !== value.supportedLanguages.length) {
    context.addIssue({ code: "custom", path: ["supportedLanguages"], message: "Duplicate languages are not allowed" })
  }
  if (!value.supportedLanguages.includes(value.primaryLanguage)) {
    context.addIssue({ code: "custom", path: ["primaryLanguage"], message: "Primary language must be included in supported languages" })
  }
})

export function normalizeWebsiteLanguageConfig(input: {
  primaryLanguage?: unknown
  supportedLanguages?: unknown
}): WebsiteLanguageConfig {
  const primaryLanguage = normalizeLocale(input.primaryLanguage)
  const rawSupported = Array.isArray(input.supportedLanguages) ? input.supportedLanguages : []
  const supportedLanguages = rawSupported
    .filter(isAppLocale)
    .filter((locale, index, values) => values.indexOf(locale) === index)
    .map((locale) => normalizeLocale(locale))

  if (!supportedLanguages.includes(primaryLanguage)) supportedLanguages.unshift(primaryLanguage)
  return { primaryLanguage, supportedLanguages }
}

export function getProjectLanguageConfig(project: {
  language?: string | null
  primaryLanguage?: string | null
  supportedLanguages?: string[] | null
}): WebsiteLanguageConfig {
  return normalizeWebsiteLanguageConfig({
    primaryLanguage: project.primaryLanguage ?? project.language,
    supportedLanguages: project.supportedLanguages,
  })
}

export function getWebsiteLanguageLabel(locale: string): string {
  return LOCALE_CONFIG[normalizeLocale(locale)].nativeName
}

export const WEBSITE_LOCALES = APP_LOCALES
