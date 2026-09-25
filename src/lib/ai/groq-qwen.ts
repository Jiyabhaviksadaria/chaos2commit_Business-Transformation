import { z, type ZodType } from "zod"

import { env } from "@/env"
import {
  ProviderRequestError,
  runStructuredGeneration,
  type StructuredResult,
  type StructuredTransport,
} from "@/lib/ai/structured-generation"
import { ChangeSetSchema, type ChangeSet } from "@/lib/changeset/changeset-validator"
import {
  WebsiteLocaleContentSchema,
  WebsiteSpecSchema,
  type WebsiteSpecData,
} from "@/modules/deliverables/website-spec"
import { getWebsiteLanguageInstructions } from "@/lib/i18n/language-prompts"
import { isAppLocale, normalizeLocale, type AppLocale } from "@/i18n/locales"

// Prompts are shared with the OpenRouter implementation so both providers
// produce the same validated structure. OpenRouter remains fully implemented
// and available; Groq is the active provider for website generation,
// translation, and the AI Design Assistant.
import {
  DESIGN_ASSISTANT_SYSTEM_PROMPT,
  MULTILINGUAL_WEBSITE_SYSTEM_PROMPT,
  WEBSITE_TRANSLATION_SYSTEM_PROMPT,
} from "@/lib/ai/openrouter"

// Re-exported so callers and tests can assert the exact prompts in use.
export { DESIGN_ASSISTANT_SYSTEM_PROMPT, MULTILINGUAL_WEBSITE_SYSTEM_PROMPT, WEBSITE_TRANSLATION_SYSTEM_PROMPT }

/** Active model. Resolved from GROQ_MODEL so the existing config stays authoritative. */
export function groqQwenModel(): string {
  return env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b"
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

export type GroqQwenResult<T> = StructuredResult<T>

type RequestContext = {
  userId?: string
  organizationId?: string
  timeoutMs?: number
}

function responseContent(value: unknown): string {
  if (typeof value === "string") return value
  if (!Array.isArray(value)) return ""
  return value
    .map((part) => {
      if (!part || typeof part !== "object") return ""
      const text = (part as Record<string, unknown>).text
      return typeof text === "string" ? text : ""
    })
    .join("")
}

function safeProviderError(status: number): { code: string; message: string } {
  if (status === 400) return { code: "GROQ_REQUEST_FAILED", message: "Groq rejected the request." }
  if (status === 401) return { code: "GROQ_AUTH_FAILED", message: "Groq authentication failed." }
  if (status === 403) return { code: "GROQ_FORBIDDEN", message: "Groq access was denied." }
  if (status === 404) return { code: "GROQ_MODEL_NOT_FOUND", message: "The configured Groq model is unavailable." }
  if (status === 429) return { code: "RATE_LIMITED", message: "The Qwen model is temporarily rate limited. Please try again later." }
  if (status >= 500) return { code: "GROQ_UNAVAILABLE", message: "Groq is temporarily unavailable." }
  return { code: "GROQ_REQUEST_FAILED", message: "Groq could not complete the request." }
}

/**
 * Groq's free tier enforces a small per-minute token budget, and a full
 * website translation consumes a large share of it. When the budget is
 * exhausted Groq reports 429 together with `x-ratelimit-reset-tokens`.
 * We wait for that window and retry exactly once, so a sequential
 * "Generate Hindi" then "Generate Gujarati" flow succeeds instead of failing
 * on the second click. No synthetic content is ever substituted.
 */
const MAX_RATE_LIMIT_WAIT_MS = 45_000
const FALLBACK_RATE_LIMIT_WAIT_MS = 20_000

function rateLimitWaitMs(headers: Headers | undefined): number {
  const raw = headers?.get?.("x-ratelimit-reset-tokens")
  const seconds = raw ? Number.parseFloat(raw) : Number.NaN
  if (!Number.isFinite(seconds) || seconds <= 0) return FALLBACK_RATE_LIMIT_WAIT_MS
  return Math.min(Math.ceil(seconds * 1000) + 1_000, MAX_RATE_LIMIT_WAIT_MS)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type GroqAttempt =
  | { ok: true; content: string }
  | { ok: false; status: number; waitMs: number }

async function requestOnce(body: string, apiKey: string, timeoutMs: number): Promise<GroqAttempt> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body,
    })

    if (!response.ok) {
      return { ok: false, status: response.status, waitMs: rateLimitWaitMs(response.headers) }
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
    return { ok: true, content: responseContent(payload.choices?.[0]?.message?.content).trim() }
  } catch {
    if (controller.signal.aborted) return { ok: false, status: 408, waitMs: 0 }
    throw new ProviderRequestError("GROQ_UNAVAILABLE", "Groq could not be reached.")
  } finally {
    clearTimeout(timeout)
  }
}

const groqQwenTransport: StructuredTransport = async ({ system, user, timeoutMs }) => {
  // Server-side only. The key is never returned to the browser.
  const apiKey = env.GROQ_API_KEY?.trim()
  if (!apiKey) throw new ProviderRequestError("GROQ_NOT_CONFIGURED", "Groq is not configured.")

  const body = JSON.stringify({
    model: groqQwenModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  })

  let attempt = await requestOnce(body, apiKey, timeoutMs)

  if (!attempt.ok && attempt.status === 429) {
    await sleep(attempt.waitMs)
    attempt = await requestOnce(body, apiKey, timeoutMs)
  }

  if (!attempt.ok) {
    if (attempt.status === 408) throw new ProviderRequestError("GROQ_TIMEOUT", "Groq request timed out.")
    const safe = safeProviderError(attempt.status)
    throw new ProviderRequestError(safe.code, safe.message)
  }
  if (!attempt.content) throw new ProviderRequestError("EMPTY_RESPONSE", "Groq returned an empty response.")
  return attempt.content
}

function generateStructuredWithGroqQwen<T>(request: {
  task: string
  system: string
  user: string
  schema: ZodType<T>
  userId?: string
  organizationId?: string
  timeoutMs?: number
}): Promise<GroqQwenResult<T>> {
  return runStructuredGeneration<T>({
    provider: "groq",
    model: groqQwenModel(),
    transport: groqQwenTransport,
    request,
  })
}

export type GenerateMultilingualWebsiteInput = RequestContext & {
  context: string
  primaryLanguage: string
  supportedLanguages: string[]
  instructions?: string
}

export async function generateMultilingualWebsite(input: GenerateMultilingualWebsiteInput): Promise<GroqQwenResult<WebsiteSpecData>> {
  const primaryLanguage = normalizeLocale(input.primaryLanguage)
  const supportedLanguages = Array.from(new Set([
    primaryLanguage,
    ...input.supportedLanguages.filter(isAppLocale).map((locale) => normalizeLocale(locale)),
  ]))
  const languageInstruction = getWebsiteLanguageInstructions(primaryLanguage, supportedLanguages)
  const user = [
    languageInstruction,
    `PRIMARY LANGUAGE: ${primaryLanguage}`,
    `SUPPORTED LANGUAGES: ${supportedLanguages.join(", ")}`,
    `BUSINESS CONTEXT:\n${input.context}`,
    input.instructions ? `ADDITIONAL INSTRUCTIONS:\n${input.instructions}` : "",
  ].filter(Boolean).join("\n\n")

  return generateStructuredWithGroqQwen({
    task: "WEBSITE_MULTILINGUAL_GENERATION",
    system: MULTILINGUAL_WEBSITE_SYSTEM_PROMPT,
    user,
    schema: WebsiteSpecSchema,
    userId: input.userId,
    organizationId: input.organizationId,
    timeoutMs: input.timeoutMs,
  })
}

export type GenerateMultilingualWebsiteTranslationInput = RequestContext & {
  sourceSpec: WebsiteSpecData
  sourceLanguage: string
  targetLanguage: string
}

export async function generateMultilingualWebsiteTranslation(input: GenerateMultilingualWebsiteTranslationInput): Promise<GroqQwenResult<z.infer<typeof WebsiteLocaleContentSchema>>> {
  const user = [
    getWebsiteLanguageInstructions(input.targetLanguage, [input.targetLanguage]),
    `SOURCE LANGUAGE: ${input.sourceLanguage}`,
    `TARGET LANGUAGE: ${input.targetLanguage}`,
    `SOURCE WEBSITE:\n${JSON.stringify(input.sourceSpec, null, 2)}`,
    "Translate only user-facing content. Preserve the source structure, IDs, order, visibility, theme, URLs, email addresses, phone numbers, numbers, brand names, product names, technical terms, and legal information. Do not invent facts.",
  ].join("\n\n")

  return generateStructuredWithGroqQwen({
    task: "WEBSITE_MULTILINGUAL_TRANSLATION",
    system: WEBSITE_TRANSLATION_SYSTEM_PROMPT,
    user,
    schema: WebsiteLocaleContentSchema,
    userId: input.userId,
    organizationId: input.organizationId,
    timeoutMs: input.timeoutMs,
  })
}

export type RunAIDesignAssistantInput = RequestContext & {
  prompt: string
  currentSpec: WebsiteSpecData
  selectedLanguage: AppLocale
  assistantLanguage: string
  projectName: string
  currentSection?: string
}

export async function runAIDesignAssistant(input: RunAIDesignAssistantInput): Promise<GroqQwenResult<ChangeSet>> {
  const context = {
    projectName: input.projectName,
    selectedWebsiteLanguage: input.selectedLanguage,
    assistantConversationLanguage: input.assistantLanguage,
    currentSection: input.currentSection || null,
    currentPage: "website",
    theme: input.currentSpec.theme,
    layout: {
      sections: input.currentSpec.sections.map((section) => ({ id: section.id, type: section.type, order: section.order, visible: section.visible })),
    },
    sections: input.currentSpec.sections,
    availableActions: ["UPDATE_BUSINESS", "UPDATE_CONTENT", "UPDATE_THEME", "UPDATE_NAVIGATION", "TOGGLE_SECTION", "REORDER_SECTIONS", "ADD_SECTION", "DELETE_SECTION"],
    instruction: input.prompt,
  }
  return generateStructuredWithGroqQwen({
    task: "EDITOR_DESIGN_ASSISTANT",
    system: DESIGN_ASSISTANT_SYSTEM_PROMPT,
    user: JSON.stringify(context),
    schema: ChangeSetSchema,
    userId: input.userId,
    organizationId: input.organizationId,
    timeoutMs: input.timeoutMs,
  })
}
