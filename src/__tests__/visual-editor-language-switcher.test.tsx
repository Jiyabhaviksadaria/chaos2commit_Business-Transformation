/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { afterEach, describe, expect, it } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"

import { WebsiteLanguageSwitcher } from "@/components/website/website-language-switcher"
import { ENABLED_LOCALES, LOCALE_CONFIG, type AppLocale } from "@/i18n/locales"
import { applyWebsiteLanguageConfig, resolveWebsiteLocale, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

/**
 * The Visual Editor website-language control and the application UI locale are
 * deliberately independent. These tests pin that separation: this switcher
 * reports a website content locale and never touches the app locale cookie.
 */
describe("visual editor website language switcher", () => {
  it("renders exactly the three website language buttons", () => {
    render(<WebsiteLanguageSwitcher currentLocale="en" onLocaleChange={() => {}} />)

    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(3)
    expect(buttons.map((button) => button.textContent?.replace("●", "").trim())).toEqual([
      LOCALE_CONFIG.en.nativeName,
      LOCALE_CONFIG.hi.nativeName,
      LOCALE_CONFIG.gu.nativeName,
    ])
  })

  it("marks the active website language with aria-pressed", () => {
    render(<WebsiteLanguageSwitcher currentLocale="gu" onLocaleChange={() => {}} />)

    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")
    expect(pressed).toHaveLength(1)
    expect(pressed[0].textContent).toContain(LOCALE_CONFIG.gu.nativeName)
  })

  it("reports a distinct locale when each of the three buttons is clicked", () => {
    const clicked: AppLocale[] = []
    render(<WebsiteLanguageSwitcher currentLocale="en" onLocaleChange={(locale) => clicked.push(locale)} />)

    const buttons = screen.getAllByRole("button")
    fireEvent.click(buttons[1]!)
    fireEvent.click(buttons[2]!)
    fireEvent.click(buttons[0]!)

    expect(clicked).toEqual(["hi", "gu", "en"])
  })

  it("ignores unsupported locales instead of inventing new ones", () => {
    render(<WebsiteLanguageSwitcher currentLocale="en" locales={["en", "hi", "fr"] as any} onLocaleChange={() => {}} />)

    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("falls back to English when the supplied locale is unsupported", () => {
    render(<WebsiteLanguageSwitcher currentLocale="fr" onLocaleChange={() => {}} />)

    const pressed = screen.getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true")
    expect(pressed[0].textContent).toContain(LOCALE_CONFIG.en.nativeName)
  })

  it("drives the complete website preview content, not just a label", () => {
    const english = buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")
    const configured = applyWebsiteLanguageConfig(english, { primaryLanguage: "en", supportedLanguages: ["en", "hi", "gu"] })
    configured.localizedContent = {
      ...(configured.localizedContent || {}),
      gu: {
        siteName: "બ્રાઇટ સ્માઇલ ક્લિનિક",
        nav: ["હોમ", "સેવાઓ"],
        sections: configured.sections.map((section) => ({ ...section, headline: "તમારું આંખનું આરોગ્ય" })),
        seo: configured.seo,
      },
    }
    configured.translationStatus = { en: "ready", hi: "translationPending", gu: "ready" }
    const ready = syncPrimaryWebsiteContent(configured)

    // Simulate the editor: selectedLanguage drives the rendered preview spec.
    const gujarati = resolveWebsiteLocale(ready, "gu")

    expect(gujarati.language).toBe("gu")
    expect(gujarati.siteName).toBe("બ્રાઇટ સ્માઇલ ક્લિનિક")
    expect(gujarati.nav).toEqual(["હોમ", "સેવાઓ"])
    expect((gujarati.sections[0] as any)?.headline).toBe("તમારું આંખનું આરોગ્ય")
    // Global design configuration stays identical across locales.
    expect(gujarati.theme).toEqual(ready.theme)
    expect(gujarati.sections.length).toBe(ready.sections.length)

    // Switching back restores the English preview rather than keeping Gujarati.
    const backToEnglish = resolveWebsiteLocale(ready, "en")
    expect(backToEnglish.language).toBe("en")
    expect(backToEnglish.siteName).toBe("Bright Smile Clinic")
  })

  it("keeps pending locales on primary content instead of faking a translation", () => {
    const english = buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")
    const configured = applyWebsiteLanguageConfig(english, { primaryLanguage: "en", supportedLanguages: ["en", "hi", "gu"] })
    const ready = syncPrimaryWebsiteContent(configured)

    // Hindi is supported but never generated: preview must stay English.
    const hindi = resolveWebsiteLocale(ready, "hi")
    expect(hindi.language).toBe("en")
    expect(hindi.siteName).toBe("Bright Smile Clinic")
  })

  it("exposes every enabled locale as a selectable website language", () => {
    expect(ENABLED_LOCALES).toEqual(["en", "hi", "gu"])
  })

  afterEach(() => cleanup())
})
