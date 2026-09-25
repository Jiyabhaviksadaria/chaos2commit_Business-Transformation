"use client"

import { LOCALE_CONFIG, ENABLED_LOCALES, isAppLocale, type AppLocale } from "@/i18n/locales"

export function WebsiteLanguageSwitcher({
  currentLocale,
  onLocaleChange,
  locales = ENABLED_LOCALES,
}: {
  supportedLocales?: string[]
  currentLocale: string
  onLocaleChange: (locale: AppLocale) => void
  locales?: readonly string[]
}) {
  const current = isAppLocale(currentLocale) ? currentLocale : "en"
  const visibleLocales = locales.filter(isAppLocale)

  return (
    <div
      role="group"
      aria-label="Website language"
      dir="ltr"
      className="flex max-w-full flex-wrap items-center gap-1 rounded-full border border-[#E5DFD4] bg-[#FAF8F2] p-1"
    >
      {visibleLocales.map((locale) => {
        const selected = locale === current
        return (
          <button
            key={locale}
            type="button"
            onClick={() => onLocaleChange(locale)}
            aria-pressed={selected}
            className={`min-h-7 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-transparent bg-white text-neutral-700 hover:border-neutral-400"}`}
          >
            {LOCALE_CONFIG[locale].nativeName}
            {selected ? <span className="ml-1" aria-hidden="true">●</span> : null}
          </button>
        )
      })}
    </div>
  )
}
