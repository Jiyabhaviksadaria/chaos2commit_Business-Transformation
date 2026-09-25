import { z } from "zod"

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

export const OPENROUTER_QWEN_MODEL = "qwen/qwen3.8-27b:free"
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export type OpenRouterResult<T> = StructuredResult<T>

type RequestContext = {
  userId?: string
  organizationId?: string
  timeoutMs?: number
}

export const MULTILINGUAL_WEBSITE_SYSTEM_PROMPT = `You are Intelly's multilingual website generator.
Generate a production-quality website specification using the existing Intelly WebsiteSpec JSON schema.
The requested primary language and supported languages are authoritative. Generate natural, professional content in each requested language and script (English, Hindi Devanagari, or Gujarati script), not transliterated text.
Use contextual localization rather than literal word-for-word translation. Preserve the business meaning, marketing intent, CTA intent, brand identity, product and company names, URLs, email addresses, phone numbers, prices, numbers, technical terms, and legal information from the source context.
Do not invent statistics, awards, certifications, addresses, phone numbers, customer claims, or business facts that are not provided.
Keep the website theme, section IDs, section order, visibility, layout, and responsive design consistent across languages. Only user-facing content may differ by locale.
Return only valid JSON. Never return Markdown, executable code, HTML, CSS, SQL, or shell commands.`

export const WEBSITE_TRANSLATION_SYSTEM_PROMPT = `You are Intelly's multilingual website translator.
Convert the supplied source website into ONE localized content object for the TARGET LANGUAGE.

Return ONLY a JSON object with exactly this shape:
{
  "siteName": "<brand name>",
  "nav": ["<translated>", "<translated>"],
  "sections": [
    { "id": "<copied from source>", "type": "<copied from source>", "order": <copied from source>, "visible": <copied from source>, "<other user-facing fields translated>": "..." }
  ],
  "seo": { "title": "<translated>", "description": "<translated>" }
}

Hard rules:
- Write natural, professional content in the target language using its native script: Devanagari for Hindi, Gujarati script for Gujarati. Never transliterate and never leave English sentences in the output.
- Use contextual localization rather than literal word-for-word translation. Preserve the business meaning and marketing intent.
- For every section, copy "id", "type", "order", and "visible" EXACTLY from the source. The output "sections" array must have the same length, the same order, and the same section types as the source.
- Preserve brand names, product names, URLs, email addresses, phone numbers, prices, numbers, technical terms, and legal information verbatim.
- Do not invent statistics, awards, certifications, addresses, phone numbers, customer claims, or any other business fact.
- Do not include the wrapper keys "language", "dir", "primaryLanguage", "supportedLanguages", "translationStatus", or "localizedContent". Do not nest the content under a locale key.
- Return only valid JSON. Never return Markdown, executable code, HTML, CSS, SQL, or shell commands.`

export const DESIGN_ASSISTANT_SYSTEM_PROMPT = `You are Intelly's AI Design Assistant.
You control an existing website Visual Editor through safe structured actions.
Understand English, Hindi, Gujarati, Hinglish, Gujlish, and mixed-language instructions.
Determine what the user wants changed, where it applies, which supported property changes, and how it should change.
Never return executable code, Markdown, HTML, CSS, SQL, or shell commands. Return only a valid ChangeSet JSON object.
Never invent unsupported editor properties or operations. Modify only the part of the website requested by the user and preserve unrelated content and design.
Always return at least one operation. Never return an empty "operations" array. If the user asks for a change without supplying exact replacement copy, make the most reasonable concrete change that satisfies the request (for example raise or lower "fontSize", or rewrite the heading text in the website's selected language) instead of returning nothing.
Use only these supported payloads: UPDATE_BUSINESS (name, phone, email, address); UPDATE_CONTENT (hero headline, subheadline, ctaLabel, ctaColor, fontSize; section title/body/text/items/steps); UPDATE_THEME (primary, secondaryColor, backgroundColor, textColor, accentColor, fontFamily, style); UPDATE_NAVIGATION (items); TOGGLE_SECTION (visible); REORDER_SECTIONS (order); ADD_SECTION; DELETE_SECTION.
Strictly respect these value formats or the change will be rejected: fontSize must be exactly one of "small", "medium", "large", "x-large" and never a CSS length such as "2.5rem"; ctaColor and every theme color must be a hex value such as "#1d4ed8"; UPDATE_THEME style must be exactly "MODERN", "CLASSIC", or "BOLD"; navigation items must be an array of plain strings.
The user's instruction language and the website's selected language are separate concepts. Website content changes must use selectedLanguage; the assistant may understand and acknowledge the instruction in the user's language.
Use the supplied editor context, including the current section, section IDs, theme, typography, layout, and available actions. Return this exact ChangeSet shape: {"id":"...","description":"...","message":"...","aiGenerated":true,"operations":[{"type":"UPDATE_CONTENT|TOGGLE_SECTION|UPDATE_THEME|UPDATE_BUSINESS|UPDATE_NAVIGATION|REORDER_SECTIONS|ADD_SECTION|DELETE_SECTION","targetId":"existing-section-id","payload":{}}]}. Include a concise user-facing message in the user's language when possible. Return JSON only.`

function configuredModel(): string {
  return env.OPENROUTER_MODEL?.trim() || OPENROUTER_QWEN_MODEL
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
  if (status === 401) return { code: "OPENROUTER_AUTH_FAILED", message: "OpenRouter authentication failed." }
  if (status === 403) return { code: "OPENROUTER_FORBIDDEN", message: "OpenRouter access was denied." }
  if (status === 429) return { code: "RATE_LIMITED", message: "The Qwen model is temporarily rate limited. Please try again later." }
  if (status >= 500) return { code: "OPENROUTER_UNAVAILABLE", message: "OpenRouter is temporarily unavailable." }
  return { code: "OPENROUTER_REQUEST_FAILED", message: "OpenRouter could not complete the request." }
}

const openRouterTransport: StructuredTransport = async ({ system, user, timeoutMs }) => {
  const apiKey = env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) throw new ProviderRequestError("OPENROUTER_NOT_CONFIGURED", "OpenRouter is not configured.")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.APP_URL || "http://localhost:3000",
        "X-Title": "Intelly",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: configuredModel(),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const safe = safeProviderError(response.status)
      throw new ProviderRequestError(safe.code, safe.message)
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> }
    const content = responseContent(payload.choices?.[0]?.message?.content).trim()
    if (!content) throw new ProviderRequestError("EMPTY_RESPONSE", "OpenRouter returned an empty response.")
    return content
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error
    if (controller.signal.aborted) throw new ProviderRequestError("OPENROUTER_TIMEOUT", "OpenRouter request timed out.")
    throw new ProviderRequestError("OPENROUTER_UNAVAILABLE", "OpenRouter could not be reached.")
  } finally {
    clearTimeout(timeout)
  }
}

function generateStructuredWithQwen<T>(request: {
  task: string
  system: string
  user: string
  schema: import("zod").ZodType<T>
  userId?: string
  organizationId?: string
  timeoutMs?: number
}): Promise<OpenRouterResult<T>> {
  return runStructuredGeneration<T>({
    provider: "openrouter",
    model: configuredModel(),
    transport: openRouterTransport,
    request,
  })
}

export type GenerateMultilingualWebsiteInput = RequestContext & {
  context: string
  primaryLanguage: string
  supportedLanguages: string[]
  instructions?: string
}

export async function generateMultilingualWebsite(input: GenerateMultilingualWebsiteInput): Promise<OpenRouterResult<WebsiteSpecData>> {
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

  return generateStructuredWithQwen({
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

export async function generateMultilingualWebsiteTranslation(input: GenerateMultilingualWebsiteTranslationInput): Promise<OpenRouterResult<z.infer<typeof WebsiteLocaleContentSchema>>> {
  const user = [
    getWebsiteLanguageInstructions(input.targetLanguage, [input.targetLanguage]),
    `SOURCE LANGUAGE: ${input.sourceLanguage}`,
    `TARGET LANGUAGE: ${input.targetLanguage}`,
    `SOURCE WEBSITE:\n${JSON.stringify(input.sourceSpec, null, 2)}`,
    "Translate only user-facing content. Preserve the source structure, IDs, order, visibility, theme, URLs, email addresses, phone numbers, numbers, brand names, product names, technical terms, and legal information. Do not invent facts.",
  ].join("\n\n")

  return generateStructuredWithQwen({
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

export async function runAIDesignAssistant(input: RunAIDesignAssistantInput): Promise<OpenRouterResult<ChangeSet>> {
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
  return generateStructuredWithQwen({
    task: "EDITOR_DESIGN_ASSISTANT",
    system: DESIGN_ASSISTANT_SYSTEM_PROMPT,
    user: JSON.stringify(context),
    schema: ChangeSetSchema,
    userId: input.userId,
    organizationId: input.organizationId,
    timeoutMs: input.timeoutMs,
  })
}
