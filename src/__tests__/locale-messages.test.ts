import { describe, expect, it } from "vitest"

import en from "@/messages/en.json"
import gu from "@/messages/gu.json"
import hi from "@/messages/hi.json"
import { APP_LOCALES, LOCALE_CONFIG, normalizeLocale } from "@/i18n/locales"

type MessageTree = { [key: string]: string | MessageTree }

const BUNDLES: Record<string, MessageTree> = {
  en: en as MessageTree,
  hi: hi as MessageTree,
  gu: gu as MessageTree,
}

function flatten(tree: MessageTree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === "string") {
      acc[path] = value
    } else {
      Object.assign(acc, flatten(value, path))
    }
    return acc
  }, {})
}

function placeholders(message: string): string[] {
  const tokens = message.match(/\{(\w+)\}/g) ?? []
  const names = tokens.map((token) => token.slice(1, -1))
  return names.filter((name, index) => names.indexOf(name) === index).sort()
}

describe("application UI locale messages", () => {
  it("ships a message bundle for every enabled application locale", () => {
    for (const locale of APP_LOCALES) {
      expect(BUNDLES[locale], `missing message bundle for ${locale}`).toBeDefined()
      expect(LOCALE_CONFIG[locale].enabled).toBe(true)
    }
  })

  it("keeps Hindi and Gujarati key sets identical to English", () => {
    const englishKeys = Object.keys(flatten(BUNDLES.en)).sort()

    for (const locale of ["hi", "gu"] as const) {
      const localeKeys = Object.keys(flatten(BUNDLES[locale])).sort()

      expect(localeKeys, `missing keys in ${locale}`).toEqual(englishKeys)
    }
  })

  it("keeps ICU placeholders consistent so interpolation never breaks", () => {
    const english = flatten(BUNDLES.en)

    for (const locale of ["hi", "gu"] as const) {
      const translated = flatten(BUNDLES[locale])

      for (const [key, message] of Object.entries(english)) {
        expect(placeholders(translated[key]), `placeholder mismatch at ${locale}:${key}`).toEqual(placeholders(message))
      }
    }
  })

  it("never leaves a translation blank", () => {
    for (const locale of APP_LOCALES) {
      for (const [key, message] of Object.entries(flatten(BUNDLES[locale]))) {
        expect(message.trim(), `blank message at ${locale}:${key}`).not.toBe("")
      }
    }
  })

  it("falls back to English for locales that are no longer supported", () => {
    expect(normalizeLocale("es")).toBe("en")
    expect(normalizeLocale("ar")).toBe("en")
    expect(BUNDLES[normalizeLocale("ar")]).toBe(BUNDLES.en)
  })
})
