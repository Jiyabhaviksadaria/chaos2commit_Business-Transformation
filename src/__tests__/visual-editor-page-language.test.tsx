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

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

/** The editor fetches the project, then POSTs language config changes. */
function mockProjectApi(gujaratiReady: boolean) {
  const spec = buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")
  const configured = applyWebsiteLanguageConfig(spec, { primaryLanguage: "en", supportedLanguages: ["en", "hi", "gu"] })

  configured.localizedContent = {
    ...(configured.localizedContent || {}),
    ...(gujaratiReady
      ? {
          gu: {
            siteName: "બ્રાઇટ સ્માઇલ ક્લિનિક",
            nav: ["હોમ", "સેવાઓ"],
            sections: configured.sections.map((section) => ({ ...section, headline: "તમારું આંખનું આરોગ્ય" })),
            seo: configured.seo,
          },
        }
      : {}),
  }
  configured.translationStatus = { en: "ready", hi: "translationPending", gu: gujaratiReady ? "ready" : "translationPending" }

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes(`/api/projects/${projectId}/language`)) {
      return { ok: true, json: async () => ({ ok: true }) } as any
    }
    if (url.includes(`/api/projects/${projectId}`)) {
      return { ok: true, json: async () => ({ spec: configured, name: "Clinic", templateId: "clinic" }) } as any
    }
    return { ok: true, json: async () => ({}) } as any
  })

  vi.stubGlobal("fetch", fetchMock)
  return { spec: configured, fetchMock }
}

async function renderEditor() {
  const { default: VisualEditorPage } = await import("@/app/projects/[projectId]/editor/page")
  const utils = render(<VisualEditorPage />)
  await waitFor(() => expect(screen.queryByText("Loading Visual Editor...")).toBeNull(), { timeout: 5000 })
  return utils
}

/** The three website-language buttons, in render order. */
function websiteLanguageButtons() {
  return screen
    .getAllByRole("button")
    .filter((button) =>
      [LOCALE_CONFIG.en.nativeName, LOCALE_CONFIG.hi.nativeName, LOCALE_CONFIG.gu.nativeName].some((name) =>
        button.textContent?.includes(name),
      ),
    )
    .filter((button) => button.getAttribute("aria-pressed") !== null)
}

describe("visual editor renders the website language switcher", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("renders the three website language buttons once the spec has loaded", async () => {
    mockProjectApi(true)
    await renderEditor()

    const buttons = websiteLanguageButtons()
    expect(buttons).toHaveLength(3)
    expect(buttons.map((b) => b.textContent?.replace("●", "").trim())).toEqual([
      LOCALE_CONFIG.en.nativeName,
      LOCALE_CONFIG.hi.nativeName,
      LOCALE_CONFIG.gu.nativeName,
    ])
  })

  it("clicking the Gujarati button changes the rendered website preview", async () => {
    mockProjectApi(true)
    await renderEditor()

    expect(screen.getByText("Bright Smile Clinic")).toBeTruthy()

    fireEvent.click(websiteLanguageButtons()[2]!)

    // The preview canvas now renders the Gujarati site name from localizedContent.
    await waitFor(() => expect(screen.getAllByText("બ્રાઇટ સ્માઇલ ક્લિનિક").length).toBeGreaterThan(0))
    expect(screen.getAllByText("તમારું આંખનું આરોગ્ય").length).toBeGreaterThan(0)
    // English content is gone from the preview.
    expect(screen.queryByText("Bright Smile Clinic")).toBeNull()
  })

  it("clicking the Gujarati button marks it selected and updates aria-pressed", async () => {
    mockProjectApi(true)
    await renderEditor()

    fireEvent.click(websiteLanguageButtons()[2]!)

    await waitFor(() => {
      const pressed = websiteLanguageButtons().filter((b) => b.getAttribute("aria-pressed") === "true")
      expect(pressed).toHaveLength(1)
      expect(pressed[0].textContent).toContain(LOCALE_CONFIG.gu.nativeName)
    })
  })

  it("switching back to English restores the English preview", async () => {
    mockProjectApi(true)
    await renderEditor()

    fireEvent.click(websiteLanguageButtons()[2]!)
    await waitFor(() => expect(screen.getAllByText("બ્રાઇટ સ્માઇલ ક્લિનિક").length).toBeGreaterThan(0))

    fireEvent.click(websiteLanguageButtons()[0]!)
    await waitFor(() => expect(screen.getAllByText("Bright Smile Clinic").length).toBeGreaterThan(0))
    expect(screen.queryByText("બ્રાઇટ સ્માઇલ ક્લિનિક")).toBeNull()
  })

  it("shows an honest empty state for a never-generated locale instead of faking it", async () => {
    mockProjectApi(false)
    await renderEditor()

    expect(screen.getAllByText("Bright Smile Clinic").length).toBeGreaterThan(0)

    fireEvent.click(websiteLanguageButtons()[2]!)

    // Gujarati was never generated: the canvas must not invent Gujarati copy
    // and must not silently keep showing English as if it were Gujarati.
    expect(screen.queryByText("બ્રાઇટ સ્માઇલ ક્લિનિક")).toBeNull()
    expect(screen.queryByText("Bright Smile Clinic")).toBeNull()
    expect(screen.getAllByText("ગુજરાતી content is not generated yet.").length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Generate ગુજરાતી/ }).length).toBeGreaterThan(0)
  })
})
