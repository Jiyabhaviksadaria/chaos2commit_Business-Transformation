import { describe, expect, it } from "vitest"

import { APP_LOCALES, normalizeLocale } from "@/i18n/locales"
import { getProjectLanguageConfig, websiteLanguageConfigSchema } from "@/lib/i18n/website-languages"
import { applyWebsiteLanguageConfig, getWebsiteLocaleStatus, resolveWebsiteLocale, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { WebsiteLocaleContentSchema, WebsiteSpecSchema } from "@/modules/deliverables/website-spec"
import { getWebsiteLanguageInstructions } from "@/lib/i18n/language-prompts"
import { detectInstructionLanguage, getAssistantLanguage } from "@/lib/ai/instruction-language"

describe("visual editor multilingual contracts", () => {
  it("normalizes supported application locales and rejects unsupported values", () => {
    expect(APP_LOCALES).toEqual(["en", "hi", "gu"])
    expect(normalizeLocale("en-US")).toBe("en")
    expect(normalizeLocale("HI")).toBe("hi")
    expect(normalizeLocale("ar")).toBe("en")
  })

  it("validates primary and supported website languages", () => {
    expect(websiteLanguageConfigSchema.safeParse({ primaryLanguage: "gu", supportedLanguages: ["gu", "hi", "en"] }).success).toBe(true)
    expect(websiteLanguageConfigSchema.safeParse({ primaryLanguage: "gu", supportedLanguages: ["hi"] }).success).toBe(false)
    expect(websiteLanguageConfigSchema.safeParse({ primaryLanguage: "gu", supportedLanguages: ["gu", "gu"] }).success).toBe(false)
  })

  it("keeps legacy project language fields backward compatible", () => {
    expect(getProjectLanguageConfig({ language: "hi", supportedLanguages: null })).toEqual({ primaryLanguage: "hi", supportedLanguages: ["hi"] })
    expect(getProjectLanguageConfig({ language: "en" })).toEqual({ primaryLanguage: "en", supportedLanguages: ["en"] })
  })

  it("keeps global website structure while resolving localized content", () => {
    const changed = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    changed.theme = { ...changed.theme, primary: "#123456" }
    changed.sections = changed.sections.map((section, index) => index === 0 ? { ...section, visible: false } : section)
    const localized = applyWebsiteLanguageConfig(changed, { primaryLanguage: "en", supportedLanguages: ["en", "hi"] })
    localized.localizedContent = {
      ...(localized.localizedContent || {}),
      hi: {
        siteName: "क्लिनिक",
        nav: ["होम", "परिचय"],
        sections: localized.sections,
        seo: localized.seo,
      },
    }
    localized.translationStatus = { en: "ready", hi: "ready" }
    const hindi = resolveWebsiteLocale(syncPrimaryWebsiteContent(localized), "hi")
    expect(hindi.language).toBe("hi")
    expect(hindi.theme.primary).toBe("#123456")
    expect(hindi.sections[0]?.visible).toBe(false)
  })

  it("builds explicit per-locale website AI instructions", () => {
    const prompt = getWebsiteLanguageInstructions("gu", ["gu", "hi", "en"])
    expect(prompt).toContain("[PRIMARY]")
    expect(prompt).toContain("Hindi")
    expect(prompt).toContain("Gujarati")
    expect(prompt).toContain("localizedContent")
  })

  it("detects English, Hindi, Gujarati, and mixed assistant instructions", () => {
    expect(detectInstructionLanguage("Change the hero heading to Modern Healthcare")).toBe("en")
    expect(detectInstructionLanguage("हीरो सेक्शन का टाइटल बदलकर Modern Healthcare कर दो")).toBe("hi")
    expect(detectInstructionLanguage("હીરો સેક્શનનું ટાઇટલ Modern Healthcare કરી દો")).toBe("gu")
    expect(detectInstructionLanguage("Hero ko thoda modern aur clean bana do")).toBe("hi")
    expect(detectInstructionLanguage("Hero section ne thodu modern ane clean banavo")).toBe("gu")
    expect(getAssistantLanguage("Hero section ne thodu modern ane clean banavo", "en")).toBe("gu")
    expect(getAssistantLanguage("Hero section ko modern ane clean banavo", "en")).toBe("en")
  })

  it("requires complete translated locale payloads while retaining partial editor snapshots", () => {
    expect(WebsiteLocaleContentSchema.safeParse({}).success).toBe(false)
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    expect(WebsiteSpecSchema.safeParse({ ...template, localizedContent: { hi: { headline: "partial" } } }).success).toBe(true)
  })

  it("preserves a legacy English source when a Hindi primary is selected", () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "English Clinic")
    template.language = "en"
    template.primaryLanguage = "hi"
    template.supportedLanguages = ["hi", "en"]
    const configured = applyWebsiteLanguageConfig(template, { primaryLanguage: "hi", supportedLanguages: ["hi", "en"] })
    expect(getWebsiteLocaleStatus(configured, "en")).toBe("ready")
    expect(configured.localizedContent?.en?.siteName).toBe("English Clinic")
    expect(getWebsiteLocaleStatus(configured, "hi")).toBe("translationPending")
  })

  it("does not label an English template fallback as the requested primary locale", () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "English Clinic")
    const configured = applyWebsiteLanguageConfig(template, { primaryLanguage: "gu", supportedLanguages: ["gu", "hi", "en"] })
    expect(getWebsiteLocaleStatus(configured, "gu")).toBe("translationPending")
    expect(resolveWebsiteLocale(configured, "gu").language).toBe("en")
  })
})
