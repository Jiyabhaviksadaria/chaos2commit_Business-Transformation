import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"
import {
  DESIGN_ASSISTANT_SYSTEM_PROMPT,
  generateMultilingualWebsite,
  generateMultilingualWebsiteTranslation,
  groqQwenModel,
  MULTILINGUAL_WEBSITE_SYSTEM_PROMPT,
  runAIDesignAssistant,
} from "@/lib/ai/groq-qwen"

vi.mock("@/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
    GROQ_API_KEY: "test-groq-key",
    GROQ_MODEL: "qwen/qwen3.8-27b",
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

function errorResponse(status: number, body: unknown = { error: { message: "nope" } }): Response {
  return {
    ok: false,
    status,
    // Tiny reset window keeps the bounded retry fast in tests.
    headers: new Headers({ "x-ratelimit-reset-tokens": "0.05" }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

describe("Groq Qwen multilingual service (active provider)", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it("resolves the model from GROQ_MODEL and defaults to the Qwen model", () => {
    expect(groqQwenModel()).toBe("qwen/qwen3.8-27b")
  })

  it("calls the Groq endpoint with the server-side key and Qwen model", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith(template))

    const result = await generateMultilingualWebsite({
      context: "A healthcare clinic serving local families.",
      primaryLanguage: "hi",
      supportedLanguages: ["hi", "en", "gu"],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider).toBe("groq")
      expect(result.data.model).toBe("qwen/qwen3.8-27b")
    }

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions")
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("qwen/qwen3.8-27b")
    expect(request?.headers).toMatchObject({ Authorization: "Bearer test-groq-key" })
    expect(body.messages[0].content).toBe(MULTILINGUAL_WEBSITE_SYSTEM_PROMPT)
    expect(body.messages[0].content).not.toBe(DESIGN_ASSISTANT_SYSTEM_PROMPT)
  })

  it("reuses the same validated localized-content schema for translation", async () => {
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
    if (result.ok) expect(result.data.provider).toBe("groq")
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.model).toBe("qwen/qwen3.8-27b")
    expect(body.messages[1].content).toContain("TARGET LANGUAGE: hi")
  })

  it("returns real validated Gujarati content for targetLanguage gu", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith({
      siteName: "ક્લિનિક",
      nav: ["હોમ", "વિશે"],
      sections: template.sections,
      seo: { title: "ક્લિનિક", description: "સ્થાનિક આરોગ્ય સેવા" },
    }))

    const result = await generateMultilingualWebsiteTranslation({
      sourceSpec: template,
      sourceLanguage: "en",
      targetLanguage: "gu",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data.siteName).toBe("ક્લિનિક")
      expect(result.data.data.nav).toEqual(["હોમ", "વિશે"])
    }
  })

  it("uses a dedicated design-assistant prompt and validated ChangeSet schema", async () => {
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
    expect(body.model).toBe("qwen/qwen3.8-27b")
    expect(body.messages[0].content).toBe(DESIGN_ASSISTANT_SYSTEM_PROMPT)
    expect(body.messages[1].content).toContain('"selectedWebsiteLanguage":"hi"')
  })

  it("understands a Gujlish instruction and returns a validated ChangeSet", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValueOnce(responseWith({
      id: "assistant-gujlish",
      description: "Update hero headline",
      message: "Hero heading motu kari didho.",
      aiGenerated: true,
      operations: [{ type: "UPDATE_CONTENT", targetId: "hero", payload: { headline: "તમારું આંખનું આરોગ્ય" } }],
    }))

    const result = await runAIDesignAssistant({
      prompt: "Hero section nu heading motu kari do.",
      currentSpec: template,
      selectedLanguage: "gu",
      assistantLanguage: "gu",
      projectName: "Clinic Practice",
      currentSection: "hero",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.data.operations[0]).toEqual({
        type: "UPDATE_CONTENT",
        targetId: "hero",
        payload: { headline: "તમારું આંખનું આરોગ્ય" },
      })
    }
    const request = vi.mocked(global.fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.messages[1].content).toContain('"assistantConversationLanguage":"gu"')
  })

  it("rejects malformed output after exactly one bounded repair request", async () => {
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
    if (!result.ok) expect(result.error.code).toBe("PARSE_FAILED")
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
  })

  it("surfaces a real rate-limit error instead of fabricating content", async () => {
    const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
    vi.mocked(global.fetch).mockResolvedValue(errorResponse(429))

    const result = await generateMultilingualWebsiteTranslation({
      sourceSpec: template,
      sourceLanguage: "en",
      targetLanguage: "hi",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("RATE_LIMITED")
      expect(result.error.message).toMatch(/rate limited/i)
    }
    // One initial attempt plus exactly one bounded retry, and no fallback content.
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
  })

  it("waits for the rate-limit window and succeeds on the single retry", async () => {
    vi.useFakeTimers()
    try {
      const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
      const rateLimited = {
        ok: false,
        status: 429,
        headers: new Headers({ "x-ratelimit-reset-tokens": "2" }),
        json: async () => ({ error: { message: "rate limit" } }),
        text: async () => "rate limit",
      } as unknown as Response

      vi.mocked(global.fetch)
        .mockResolvedValueOnce(rateLimited)
        .mockResolvedValueOnce(responseWith({
          siteName: "क्लिनिक",
          nav: ["होम"],
          sections: template.sections,
          seo: { title: "क्लिनिक", description: "स्वास्थ्य सेवा" },
        }))

      const pending = generateMultilingualWebsiteTranslation({
        sourceSpec: template,
        sourceLanguage: "en",
        targetLanguage: "hi",
      })

      // Let the bounded wait elapse.
      await vi.advanceTimersByTimeAsync(5_000)
      const result = await pending

      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data.data.siteName).toBe("क्लिनिक")
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it("reports a missing key as a configuration error, never as content", async () => {
    const { env } = await import("@/env")
    const originalKey = env.GROQ_API_KEY
    // Temporarily unset the optional key to exercise the config-error path.
    env.GROQ_API_KEY = undefined
    try {
      const template = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
      const result = await generateMultilingualWebsiteTranslation({
        sourceSpec: template,
        sourceLanguage: "en",
        targetLanguage: "gu",
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe("GROQ_NOT_CONFIGURED")
    } finally {
      // Restore the key for the remaining cases.
      env.GROQ_API_KEY = originalKey
    }
  })
})
