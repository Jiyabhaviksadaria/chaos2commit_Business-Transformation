import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { getLocaleDefinition, isAppLocale, normalizeLocale, type AppLocale } from "@/i18n/locales"
import { getProjectLanguageConfig, type WebsiteLanguageConfig } from "@/lib/i18n/website-languages"

type LocaleContent = NonNullable<WebsiteSpecData["localizedContent"]>[string]

export function getWebsiteLanguageConfigFromSpec(spec: Pick<WebsiteSpecData, "language" | "primaryLanguage" | "supportedLanguages">): WebsiteLanguageConfig {
  return getProjectLanguageConfig(spec)
}

export function getSupportedWebsiteLocales(spec: Pick<WebsiteSpecData, "language" | "primaryLanguage" | "supportedLanguages">): AppLocale[] {
  return getWebsiteLanguageConfigFromSpec(spec).supportedLanguages
}

function hasLocaleContent(content: LocaleContent | undefined): boolean {
  return Boolean(content && content.siteName && content.nav?.length && content.sections?.length && content.seo)
}

function hasTopLevelPrimaryContent(spec: WebsiteSpecData, primaryLanguage: string): boolean {
  // A missing legacy language field means the existing top-level shape is the
  // primary content. An explicit different language means it is a fallback.
  return !spec.language || normalizeLocale(spec.language) === normalizeLocale(primaryLanguage)
}

function mergeLocalizedSections(
  primarySections: WebsiteSpecData["sections"],
  localizedSections: WebsiteSpecData["sections"] | undefined,
): WebsiteSpecData["sections"] {
  if (!localizedSections?.length) return primarySections

  const localizedById = new Map(
    localizedSections.filter((section) => section.id).map((section) => [section.id, section]),
  )
  return primarySections.map((section, index) => {
    const localized = section.id ? localizedById.get(section.id) : localizedSections[index]
    if (!localized) return section
    localizedById.delete(section.id)
    // Section structure is global. Only localized content is merged from the
    // locale copy; translated-only sections are intentionally not introduced.
    return {
      ...section,
      ...localized,
      id: section.id,
      type: section.type,
      order: section.order,
      visible: section.visible,
    } as typeof section
  })
}

function getPrimaryContent(spec: WebsiteSpecData, config: WebsiteLanguageConfig) {
  const source = spec.localizedContent?.[config.primaryLanguage]
  const sourceReady = hasLocaleContent(source)
  return {
    siteName: (sourceReady ? source?.siteName : undefined) || spec.siteName,
    nav: (sourceReady && source?.nav?.length ? source.nav : spec.nav),
    // Theme and section ordering/visibility are global design configuration.
    sections: (sourceReady && source?.sections?.length ? source.sections : spec.sections),
    seo: { ...spec.seo, ...(sourceReady ? source?.seo || {} : {}) },
    ui: { ...(spec.ui || {}), ...(sourceReady ? source?.ui || {} : {}) },
  }
}

function isPrimaryContentReady(spec: WebsiteSpecData, config: WebsiteLanguageConfig): boolean {
  return hasTopLevelPrimaryContent(spec, config.primaryLanguage) || hasLocaleContent(spec.localizedContent?.[config.primaryLanguage])
}

export function resolveWebsiteLocale(
  spec: WebsiteSpecData,
  requestedLocale?: string | null,
  fallbackPrimary?: string | null,
): WebsiteSpecData {
  const specConfig = getWebsiteLanguageConfigFromSpec(spec)
  const config = fallbackPrimary
    ? { ...specConfig, primaryLanguage: normalizeLocale(fallbackPrimary) }
    : specConfig
  const primary = config.primaryLanguage
  const requested = normalizeLocale(requestedLocale, primary)
  const supportedRequested = config.supportedLanguages.includes(requested)
  const primaryReady = isPrimaryContentReady(spec, config)
  const requestedReady = supportedRequested && (
    requested === primary
      ? primaryReady
      : getWebsiteLocaleStatus(spec, requested) === "ready" && hasLocaleContent(spec.localizedContent?.[requested])
  )
  const locale = requestedReady ? requested : primary
  const isPrimary = locale === primary
  const localized = isPrimary ? undefined : spec.localizedContent?.[locale]
  // If a requested locale is pending, expose the language of the content that
  // is actually being rendered rather than mislabeling fallback copy.
  const renderedLocale = isPrimary && !primaryReady
    ? normalizeLocale(spec.language || primary)
    : locale
  const localeDefinition = getLocaleDefinition(renderedLocale)

  return {
    ...spec,
    ...(localized || {}),
    // The top-level spec is the canonical primary-language content. Theme and
    // section structure are global and must remain identical across locales.
    siteName: isPrimary ? spec.siteName : localized?.siteName || spec.siteName,
    language: renderedLocale,
    dir: localeDefinition.direction,
    primaryLanguage: config.primaryLanguage,
    supportedLanguages: config.supportedLanguages,
    translationStatus: spec.translationStatus,
    localizedContent: spec.localizedContent,
    nav: isPrimary ? spec.nav : localized?.nav || spec.nav,
    sections: isPrimary ? spec.sections : mergeLocalizedSections(spec.sections, localized?.sections),
    theme: spec.theme,
    seo: isPrimary ? spec.seo : { ...spec.seo, ...(localized?.seo || {}) },
    ui: isPrimary ? spec.ui : { ...(spec.ui || {}), ...(localized?.ui || {}) },
  }
}

export function syncPrimaryWebsiteContent(spec: WebsiteSpecData): WebsiteSpecData {
  const config = getWebsiteLanguageConfigFromSpec(spec)
  const primaryContent = {
    siteName: spec.siteName,
    nav: spec.nav,
    sections: spec.sections,
    seo: spec.seo,
    ui: spec.ui,
  }
  const topLevelIsPrimary = hasTopLevelPrimaryContent(spec, config.primaryLanguage)
  const localizedContent = { ...(spec.localizedContent || {}) }
  const existingPrimaryContent = localizedContent[config.primaryLanguage]
  if (topLevelIsPrimary) {
    localizedContent[config.primaryLanguage] = primaryContent
  }
  const primaryReady = topLevelIsPrimary || hasLocaleContent(existingPrimaryContent)
  return {
    ...spec,
    localizedContent,
    translationStatus: {
      ...(spec.translationStatus || {}),
      [config.primaryLanguage]: primaryReady ? "ready" : "translationPending",
    },
  }
}

export function applyWebsiteLanguageConfig(spec: WebsiteSpecData, config: WebsiteLanguageConfig): WebsiteSpecData {
  const localizedContent = { ...(spec.localizedContent || {}) }
  const legacyLanguage = spec.language
  if (legacyLanguage && isAppLocale(legacyLanguage) && normalizeLocale(legacyLanguage) !== config.primaryLanguage && !hasLocaleContent(localizedContent[normalizeLocale(legacyLanguage)])) {
    localizedContent[normalizeLocale(legacyLanguage)] = {
      siteName: spec.siteName,
      nav: spec.nav,
      sections: spec.sections,
      seo: spec.seo,
      ui: spec.ui,
    }
  }
  const sourcePrimary = localizedContent[config.primaryLanguage]
  const primaryContent = getPrimaryContent({ ...spec, localizedContent }, config)
  const primaryReady = isPrimaryContentReady({ ...spec, localizedContent }, config)
  // Do not manufacture a translated primary entry from an English fallback.
  if (primaryReady || hasLocaleContent(sourcePrimary)) {
    localizedContent[config.primaryLanguage] = primaryContent
  }
  const additionalStatuses: Record<string, "ready" | "generating" | "translationPending" | "error"> = {}
  for (const locale of config.supportedLanguages) {
    if (locale === config.primaryLanguage) continue
    additionalStatuses[locale] = spec.translationStatus?.[locale] || (hasLocaleContent(localizedContent[locale]) ? "ready" : "translationPending")
  }

  return {
    ...spec,
    siteName: primaryContent.siteName,
    nav: primaryContent.nav,
    sections: primaryContent.sections,
    seo: primaryContent.seo,
    ui: primaryContent.ui,
    language: primaryReady ? config.primaryLanguage : spec.language,
    dir: primaryReady ? getLocaleDefinition(config.primaryLanguage).direction : spec.dir,
    primaryLanguage: config.primaryLanguage,
    supportedLanguages: config.supportedLanguages,
    translationStatus: {
      ...(spec.translationStatus || {}),
      [config.primaryLanguage]: primaryReady ? "ready" : spec.translationStatus?.[config.primaryLanguage] || "translationPending",
      ...additionalStatuses,
    },
    localizedContent,
  }
}

export function getWebsiteLocaleStatus(spec: WebsiteSpecData, locale: string): "ready" | "generating" | "translationPending" | "error" {
  const normalized = normalizeLocale(locale)
  const config = getWebsiteLanguageConfigFromSpec(spec)
  const explicitStatus = spec.translationStatus?.[normalized]
  if (normalized === config.primaryLanguage) {
    if (explicitStatus === "error" || explicitStatus === "generating") return explicitStatus
    return isPrimaryContentReady(spec, config) ? "ready" : "translationPending"
  }
  if (explicitStatus === "error" || explicitStatus === "generating") return explicitStatus
  if (explicitStatus === "ready" && hasLocaleContent(spec.localizedContent?.[normalized])) return "ready"
  return hasLocaleContent(spec.localizedContent?.[normalized]) ? "ready" : "translationPending"
}

export function hasLocalizedWebsiteContent(spec: WebsiteSpecData, locale: string): boolean {
  return hasLocaleContent(spec.localizedContent?.[normalizeLocale(locale)])
}
