/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"

import enMessages from "@/messages/en.json"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { applyWebsiteLanguageConfig } from "@/lib/website/localized-spec"
import { LOCALE_CONFIG } from "@/i18n/locales"

const projectId = "test-project"

vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const table = ((enMessages as any)[namespace] ?? {}) as Record<string, string>
    const translate = ((key: string, values?: Record<string, string>) =>
      Object.entries(values || {}).reduce(
        (result, [name, value]) => result.replace(`{${name}}`, value),
        table[key] ?? key,
      )) as unknown as {
      (key: string, values?: Record<string, string>): string
      has: (key: string) => boolean
    }
    translate.has = (key: string) => Object.prototype.hasOwnProperty.call(table, key)
    return translate
  },
}))

const toastMock = { error: vi.fn(), success: vi.fn(), message: vi.fn() }
vi.mock("sonner", () => ({ toast: toastMock }))

const ENGLISH = "Bright Smile Clinic"
const HINDI_SITE = "ब्राइट स्माइल क्लिनिक"
const HINDI_HEADLINE = "आधुनिक स्वास्थ्य देखभाल"
const GUJARATI_SITE = "બ્રાઇટ સ્માઇલ ક્લિનિક"

/** Builds an en-primary project with ready Hindi and Gujarati locales. */
function buildProjectSpec() {
  const base = buildWebsiteSpecFromTemplate("clinic", ENGLISH)
  base.theme = { ...base.theme, primary: "#0D9488" }
  const configured = applyWebsiteLanguageConfig(base, {
    primaryLanguage: "en",
    supportedLanguages: ["en", "hi", "gu"],
  })

  configured.localizedContent = {
    ...(configured.localizedContent || {}),
    hi: {
      siteName: HINDI_SITE,
      nav: ["होम", "सेवाएं"],
      sections: configured.sections.map((section) =>
        section.type === "hero" ? { ...section, headline: HINDI_HEADLINE } : section,
      ),
      seo: { title: HINDI_SITE, description: "स्वास्थ्य सेवा" },
    },
    gu: {
      siteName: GUJARATI_SITE,
      nav: ["હોમ", "સેવાઓ"],
      sections: configured.sections,
      seo: { title: GUJARATI_SITE, description: "આરોગ્ય સેવા" },
    },
  }
  configured.translationStatus = { en: "ready", hi: "ready", gu: "ready" }
  return configured
}

type AssistantResponse = { status: number; body: unknown }

function mockApi(assistant: AssistantResponse) {
  const calls: { url: string; body: any }[] = []
  const spec = buildProjectSpec()

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("/website/assistant")) {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null })
      return { ok: assistant.status < 400, status: assistant.status, json: async () => assistant.body } as any
    }
    if (url.includes(`/api/projects/${projectId}/language`)) {
      return { ok: true, json: async () => ({ ok: true }) } as any
    }
    if (url.includes(`/api/projects/${projectId}`)) {
      return { ok: true, json: async () => ({ spec, name: "Clinic", templateId: "clinic" }) } as any
    }
    return { ok: true, json: async () => ({}) } as any
  })

  vi.stubGlobal("fetch", fetchMock)
  return { calls, fetchMock, spec }
}

const FONT_SIZE_CHANGE = {
  id: "assistant-1",
  description: "Increase hero heading size",
  message: "Hero heading updated.",
  aiGenerated: true,
  operations: [{ type: "UPDATE_CONTENT", targetId: "hero", payload: { fontSize: "x-large" } }],
}

async function renderEditor() {
  const { default: VisualEditorPage } = await import("@/app/projects/[projectId]/editor/page")
  const utils = render(<VisualEditorPage />)
  await waitFor(() => expect(screen.queryByText("Loading Visual Editor...")).toBeNull(), { timeout: 5000 })
  return utils
}

function websiteLanguageButtons() {
  return screen
    .getAllByRole("button")
    .filter((b) =>
      [LOCALE_CONFIG.en.nativeName, LOCALE_CONFIG.hi.nativeName, LOCALE_CONFIG.gu.nativeName].some((n) =>
        b.textContent?.includes(n),
      ),
    )
    .filter((b) => b.getAttribute("aria-pressed") !== null)
}

function heroHeading(): HTMLElement | null {
  return document.querySelector("main h1")
}

async function runAssistant(prompt: string, changeSet: unknown = FONT_SIZE_CHANGE) {
  const textarea = screen.getByPlaceholderText(enMessages.WebsiteBuilder.assistantPlaceholder)
  fireEvent.change(textarea, { target: { value: prompt } })
  fireEvent.click(screen.getByRole("button", { name: enMessages.WebsiteBuilder.applyRequirement }))
  void changeSet
}

describe("AI Design Assistant end-to-end flow", () => {
  beforeEach(() => {
    vi.resetModules()
    toastMock.error.mockClear()
    toastMock.success.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("A: applies a Hinglish instruction to the Hindi preview", async () => {
    const { calls } = mockApi({ status: 200, body: { ok: true, changeSet: FONT_SIZE_CHANGE, assistantLanguage: "hi", message: "Hero heading updated." } })
    await renderEditor()

    // Switch the website to Hindi first.
    fireEvent.click(websiteLanguageButtons()[1]!)
    await waitFor(() => expect(screen.getAllByText(HINDI_SITE).length).toBeGreaterThan(0))

    const before = heroHeading()?.getAttribute("style") ?? ""
    expect(before).not.toContain("clamp(3.5rem, 7vw, 5.5rem)")

    await runAssistant("Hero ka heading bada kar do.")

    await waitFor(() => expect(calls.length).toBe(1))
    // Request contract
    expect(calls[0].url).toBe(`/api/projects/${projectId}/website/assistant`)
    expect(calls[0].body.prompt).toBe("Hero ka heading bada kar do.")
    expect(calls[0].body.selectedLanguage).toBe("hi")
    expect(calls[0].body.spec).toBeTruthy()
    expect(calls[0].body.spec.siteName).toBe(HINDI_SITE)

    // Preview must visibly change.
    await waitFor(() => {
      expect(heroHeading()?.getAttribute("style") || "").toContain("clamp(3.5rem, 7vw, 5.5rem)")
    })
    // Website stays Hindi.
    expect(screen.getAllByText(HINDI_SITE).length).toBeGreaterThan(0)
    expect(toastMock.error).not.toHaveBeenCalled()
    // Success is reported persistently, not only as a transient toast.
    const feedback = screen.getByTestId("assistant-feedback")
    expect(feedback.getAttribute("data-tone")).toBe("success")
    expect(feedback.textContent).toBe("Hero heading updated.")
  })

  it("B: applies a Gujlish instruction to the Gujarati preview", async () => {
    const { calls } = mockApi({ status: 200, body: { ok: true, changeSet: FONT_SIZE_CHANGE, assistantLanguage: "gu", message: "Hero heading motu kar diya." } })
    await renderEditor()

    fireEvent.click(websiteLanguageButtons()[2]!)
    await waitFor(() => expect(screen.getAllByText(GUJARATI_SITE).length).toBeGreaterThan(0))

    await runAssistant("Hero section nu heading motu kari do.")
    await waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].body.selectedLanguage).toBe("gu")

    await waitFor(() => {
      expect(heroHeading()?.getAttribute("style") || "").toContain("clamp(3.5rem, 7vw, 5.5rem)")
    })
    expect(screen.getAllByText(GUJARATI_SITE).length).toBeGreaterThan(0)
  })

  it("C: applies an English instruction on the English preview", async () => {
    const { calls } = mockApi({ status: 200, body: { ok: true, changeSet: FONT_SIZE_CHANGE, assistantLanguage: "en", message: "Hero heading updated." } })
    await renderEditor()

    expect(screen.getAllByText(ENGLISH).length).toBeGreaterThan(0)
    await runAssistant("Change the hero heading.")
    await waitFor(() => expect(calls.length).toBe(1))
    expect(calls[0].body.selectedLanguage).toBe("en")

    await waitFor(() => {
      expect(heroHeading()?.getAttribute("style") || "").toContain("clamp(3.5rem, 7vw, 5.5rem)")
    })
  })

  it("D: ignores an invalid API response without corrupting editor state", async () => {
    mockApi({ status: 200, body: { ok: true, changeSet: { id: "x", description: "d", aiGenerated: true, operations: [{ type: "UPDATE_CONTENT", targetId: "does-not-exist", payload: { headline: "nope" } }] }, assistantLanguage: "en" } })
    await renderEditor()

    const before = heroHeading()?.textContent
    await runAssistant("Change the hero heading.")

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    expect(toastMock.success).not.toHaveBeenCalled()
    expect(heroHeading()?.textContent).toBe(before)
    expect(screen.getByTestId("assistant-feedback").getAttribute("data-tone")).toBe("error")
  })

  it("D2: does not report success when the model returns no applicable operation", async () => {
    mockApi({ status: 200, body: { ok: true, changeSet: { id: "x", description: "d", aiGenerated: true, operations: [] }, assistantLanguage: "en" } })
    await renderEditor()

    const before = heroHeading()?.getAttribute("style") ?? ""
    await runAssistant("Change the hero heading.")

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    expect(toastMock.success).not.toHaveBeenCalled()
    expect(heroHeading()?.getAttribute("style") ?? "").toBe(before)
  })

  it("E: shows a clear error and preserves the site on a 429", async () => {
    mockApi({ status: 429, body: { error: "The Qwen model is busy. Please try again shortly." } })
    await renderEditor()

    const before = heroHeading()?.getAttribute("style") ?? ""
    await runAssistant("Hero ka heading bada kar do.")

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled())
    expect(toastMock.success).not.toHaveBeenCalled()
    expect(heroHeading()?.getAttribute("style") ?? "").toBe(before)
    expect(screen.getAllByText(ENGLISH).length).toBeGreaterThan(0)
  })
})
