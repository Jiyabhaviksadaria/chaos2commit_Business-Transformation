/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest"

import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import { applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"

const projectId = "p1"

const ENGLISH = "Bright Smile Clinic"
const HINDI_SITE = "ब्राइट स्माइल क्लिनिक"
const GUJARATI_SITE = "બ્રાઇટ સ્માઇલ ક્લિનિક"

vi.mock("@/lib/access", () => ({
  requireProjectAccess: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ db: {} }))

const runAIDesignAssistant = vi.fn()
vi.mock("@/lib/ai/groq-qwen", () => ({
  runAIDesignAssistant: (...args: unknown[]) => runAIDesignAssistant(...args),
}))

/** The exact ChangeSet the live Groq model returned. */
const LIVE_CHANGE_SET = {
  id: "op-1715623456789",
  description: "Increase the font size of the hero section headline to 'x-large'.",
  message: "Hero heading updated.",
  aiGenerated: true,
  operations: [{ type: "UPDATE_CONTENT", targetId: "hero", payload: { fontSize: "x-large" } }],
}

function buildSpec() {
  const base = buildWebsiteSpecFromTemplate("clinic", ENGLISH)
  const configured = applyWebsiteLanguageConfig(base, { primaryLanguage: "en", supportedLanguages: ["en", "hi", "gu"] })
  configured.localizedContent = {
    ...(configured.localizedContent || {}),
    hi: {
      siteName: HINDI_SITE,
      nav: ["होम", "सेवाएं"],
      sections: configured.sections,
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
  return syncPrimaryWebsiteContent(configured)
}

async function callRoute(body: unknown, projectOverrides: Record<string, unknown> = {}) {
  const { requireProjectAccess } = await import("@/lib/access")
  vi.mocked(requireProjectAccess).mockResolvedValue({
    user: { id: "user-1" },
    project: {
      id: projectId,
      name: "Clinic",
      primaryLanguage: "en",
      supportedLanguages: ["en", "hi"],
      workspace: { organizationId: "org-1" },
      ...projectOverrides,
    },
  } as never)

  const { POST } = await import("@/app/api/projects/[projectId]/website/assistant/route")
  const request = new Request(`http://localhost/api/projects/${projectId}/website/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const response = await POST(request, { params: { projectId } })
  return { status: response.status, body: await response.json() }
}

describe("POST /website/assistant route", () => {
  beforeEach(() => {
    runAIDesignAssistant.mockReset()
    runAIDesignAssistant.mockResolvedValue({
      ok: true,
      data: { data: LIVE_CHANGE_SET, provider: "groq", model: "qwen/qwen3.8-27b" },
    })
  })

  it("accepts a Hinglish instruction while the website is Hindi", async () => {
    const spec = buildSpec()
    const { status, body } = await callRoute({
      prompt: "Hero ka heading bada kar do.",
      spec: { ...spec, localizedContent: spec.localizedContent },
      selectedLanguage: "hi",
      currentSection: "hero",
      projectName: ENGLISH,
    })

    console.log("hi ->", status, JSON.stringify(body).slice(0, 400))
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.changeSet.operations[0]).toEqual({
      type: "UPDATE_CONTENT",
      targetId: "hero",
      payload: { fontSize: "x-large" },
    })
  })

  it("accepts an English instruction on the English website", async () => {
    const spec = buildSpec()
    const { status, body } = await callRoute({
      prompt: "Change the hero heading.",
      spec,
      selectedLanguage: "en",
      currentSection: "hero",
      projectName: ENGLISH,
    })

    console.log("en ->", status, JSON.stringify(body).slice(0, 400))
    expect(status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it("accepts a Gujlish instruction when Gujarati is the primary language", async () => {
    const spec = buildSpec()
    const { status, body } = await callRoute(
      {
        prompt: "Hero section nu heading motu kari do.",
        spec,
        selectedLanguage: "gu",
        currentSection: "hero",
        projectName: ENGLISH,
      },
      { primaryLanguage: "gu", supportedLanguages: ["gu", "en"] },
    )

    console.log("gu ->", status, JSON.stringify(body).slice(0, 400))
    expect(status).toBe(200)
  })

  it("rejects a language the project has not enabled", async () => {
    const spec = buildSpec()
    const { status, body } = await callRoute({
      prompt: "Hero ka heading bada kar do.",
      spec,
      selectedLanguage: "gu",
      currentSection: "hero",
    })

    console.log("gu-not-enabled ->", status, JSON.stringify(body).slice(0, 200))
    expect(status).toBe(409)
  })

  it("surfaces a provider failure as 503 without inventing content", async () => {
    runAIDesignAssistant.mockResolvedValue({
      ok: false,
      error: { code: "GROQ_UNAVAILABLE", message: "Groq could not complete the request." },
    })
    const spec = buildSpec()
    const { status, body } = await callRoute({
      prompt: "Hero ka heading bada kar do.",
      spec,
      selectedLanguage: "en",
    })

    console.log("provider-error ->", status, JSON.stringify(body).slice(0, 200))
    expect(status).toBe(503)
    expect(body.changeSet).toBeUndefined()
  })

  it("rejects an empty operations array from the model", async () => {
    runAIDesignAssistant.mockResolvedValue({
      ok: true,
      data: {
        data: { id: "x", description: "d", aiGenerated: true, operations: [] },
        provider: "groq",
        model: "qwen/qwen3.8-27b",
      },
    })
    const spec = buildSpec()
    const { status } = await callRoute({
      prompt: "Change the hero heading.",
      spec,
      selectedLanguage: "en",
    })

    console.log("empty-ops ->", status)
    expect(status).toBe(422)
  })
})
