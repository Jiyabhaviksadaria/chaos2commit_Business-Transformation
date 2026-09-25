import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import {
  DESIGN_ASSISTANT_SYSTEM_PROMPT,
  generateMultilingualWebsite,
  generateMultilingualWebsiteTranslation,
  MULTILINGUAL_WEBSITE_SYSTEM_PROMPT,
  OPENROUTER_QWEN_MODEL,
  runAIDesignAssistant,
} from "@/lib/ai/openrouter"

vi.mock("@/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    OPENROUTER_API_KEY: "test-openrouter-key",
    OPENROUTER_MODEL: "qwen/qwen3.8-27b:free",
  },
}))

vi.mock("@/lib/db", () => ({
  db: { aiUsage: { create: vi.fn().mockResolvedValue({}) } },
}))

const originalFetch = global.fetch

function responseWith(content: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) } }] }),
  } as unknown as Response
}

describe("OpenRouter Qwen multilingual service", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it("uses the exact Qwen model and a website-specific prompt", async () => {
    expect(OPENROUTER_QWEN_MODEL).toBe("qwen/qwen3.8-27b:free")
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith(template))

    const result = await generateMultilingualWebsite({
      context: "A healthcare clinic serving local families.",
      primaryLanguage: "hi",
      supportedLanguages: ["hi", "en", "gu"],
    })

    expect(result.ok).toBe(true)
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe("https://openrouter.ai/api/v1/chat/completions")
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("qwen/qwen3.8-27b:free")
    expect(request?.headers).toMatchObject({ Authorization: "Bearer test-openrouter-key" })
    expect(body.messages[0].content).toBe(MULTILINGUAL_WEBSITE_SYSTEM_PROMPT)
    expect(body.messages[0].content).not.toBe(DESIGN_ASSISTANT_SYSTEM_PROMPT)
  })

  it("uses the same Qwen service with a dedicated localized-content schema", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith({
      siteName: "क्लिनिक",
      nav: ["होम", "परिचय"],
      sections: template.sections,
      seo: { title: "क्लिनिक", description: "स्थानीय स्वास्थ्य सेवा" },
    }))

    const result = await generateMultilingualWebsiteTranslation({
      sourceSpec: template,
      sourceLanguage: "en",
      targetLanguage: "hi",
    })

    expect(result.ok).toBe(true)
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("qwen/qwen3.8-27b:free")
    expect(body.messages[1].content).toContain("TARGET LANGUAGE: hi")
  })

  it("rejects malformed Qwen output after one bounded repair request", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "not valid JSON" } }] }),
    } as unknown as Response)

    const result = await runAIDesignAssistant({
      prompt: "Change the hero heading",
      currentSpec: template,
      selectedLanguage: "en",
      assistantLanguage: "en",
      projectName: "Clinic Practice",
    })

    expect(result.ok).toBe(false)
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
  })

  it("uses a separate structured design-assistant prompt and context", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith({
      id: "assistant-test",
      description: "Update hero heading",
      message: "Hero heading updated.",
      aiGenerated: true,
      operations: [{ type: "UPDATE_CONTENT", targetId: "hero", payload: { headline: "Modern Healthcare" } }],
    }))

    const result = await runAIDesignAssistant({
      prompt: "Hero ka heading bada kar do",
      currentSpec: template,
      selectedLanguage: "hi",
      assistantLanguage: "hi",
      projectName: "Clinic Practice",
      currentSection: "hero",
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.data.message).toBe("Hero heading updated.")
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("qwen/qwen3.8-27b:free")
    expect(body.messages[0].content).toBe(DESIGN_ASSISTANT_SYSTEM_PROMPT)
    expect(body.messages[1].content).toContain('"selectedWebsiteLanguage":"hi"')
    expect(body.messages[1].content).toContain('"currentSection":"hero"')
  })
})
