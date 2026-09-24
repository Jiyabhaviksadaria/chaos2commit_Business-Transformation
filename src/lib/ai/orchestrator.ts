import { ZodType, z } from "zod"
import { Result, fail, ok } from "@/lib/result"
import { parseAndValidate } from "./json"
import { logAiUsage } from "./usage"
import { checkRateLimit } from "./ratelimit"
import { generateGroqContent, groqChatStream } from "./providers/groq"
import { generateGeminiContent, geminiChatStream } from "./providers/gemini"
import { generateMockContent, mockChatStream } from "./providers/mock"
import { env } from "@/env"
import { AiTaskStatus } from "@prisma/client"

export type GenerateOpts<T> = {
  task: string
  system: string
  user: string
  schema: ZodType<T>
  language: string
  userId?: string
  organizationId?: string
  /** Optional deterministic fixture used only when AI_MOCK=true. */
  mockFixture?: T
}

const PROVIDERS = ["groq", "gemini", "mock"]

const TextResultSchema = z.object({
  text: z.string()
})

export async function generateText(opts: {
  task: string
  system: string
  user: string
  language: string
  userId?: string
  organizationId?: string
}): Promise<Result<{ text: string; provider: string; model: string }, string>> {
  const res = await generateStructured({
    task: opts.task,
    system: `${opts.system}\n\nRespond with a JSON object containing key 'text' with your response string.`,
    user: opts.user,
    schema: TextResultSchema,
    language: opts.language,
    userId: opts.userId,
    organizationId: opts.organizationId
  })

  if (!res.ok) {
    return fail(res.error.message)
  }
  return ok({ text: res.data.data.text, provider: res.data.provider, model: res.data.model })
}

export async function generateStructured<T>(opts: GenerateOpts<T>): Promise<Result<{ data: T; provider: string; model: string }, { code: string; message: string }>> {
  if (opts.userId) {
    const rl = checkRateLimit(opts.userId)
    if (!rl.ok) return dlFail("RATE_LIMITED", rl.error.message)
  }

  const enhancedSystem = `${opts.system}\n\nWrite all string values in ${opts.language}. Keep JSON keys and enum values exactly as specified, in English. Output JSON only.`

  for (const provider of PROVIDERS) {
    if (provider === "mock" && env.AI_MOCK !== "true") continue

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)
    const startTime = Date.now()
    
    let rawResult = ""
    const currentModel = getModelNameFor(provider)
    let providerSuccess = false

    try {
      rawResult = await fetchFromProvider(provider, enhancedSystem, opts.user, controller.signal, opts.task, opts.mockFixture)
      let parsed = parseAndValidate(rawResult, opts.schema)

      if (!parsed.ok) {
        // Retry ONCE with repair prompt
        const repairUser = `${opts.user}\n\nYour previous JSON output failed validation:\n${parsed.error.message}\n\nPlease fix the JSON and return only valid JSON.`
        rawResult = await fetchFromProvider(provider, enhancedSystem, repairUser, controller.signal, opts.task, opts.mockFixture)
        parsed = parseAndValidate(rawResult, opts.schema)
      }

      if (parsed.ok) {
        providerSuccess = true
        clearTimeout(timeout)
        
        await logAiUsage({
          userId: opts.userId,
          organizationId: opts.organizationId,
          provider,
          model: currentModel,
          task: opts.task,
          latencyMs: Date.now() - startTime,
          status: AiTaskStatus.SUCCESS,
        })
        
        return ok({ data: parsed.data, provider, model: currentModel })
      }
    } catch {
      // Catch fetch errors, aborts or missing API keys gracefully
    } finally {
      clearTimeout(timeout)
      if (!providerSuccess) {
        await logAiUsage({
          userId: opts.userId,
          organizationId: opts.organizationId,
          provider,
          model: currentModel,
          task: opts.task,
          latencyMs: Date.now() - startTime,
          status: AiTaskStatus.FALLBACK,
          error: "Failed or Aborted"
        })
      }
    }
  }

  return dlFail("AI_UNAVAILABLE", "All AI providers failed to generate valid content.")
}

export async function* chatStream(opts: { messages: {role: string, content: string}[], userId?: string }): AsyncIterable<string> {
  if (opts.userId) {
    const rl = checkRateLimit(opts.userId)
    if (!rl.ok) {
      yield "Rate limit exceeded."
      return
    }
  }

  for (const provider of PROVIDERS) {
    if (provider === "mock" && env.AI_MOCK !== "true") continue

    const controller = new AbortController()

    try {
      if (provider === "mock") {
        yield* mockChatStream()
        return
      } else if (provider === "groq") {
        yield* groqChatStream(opts.messages, controller.signal)
        return
      } else if (provider === "gemini") {
        yield* geminiChatStream(opts.messages, controller.signal)
        return
      }
    } catch {
      // failover to next provider
    }
  }

  yield "AI providers unavailable."
}

async function fetchFromProvider<T>(provider: string, system: string, user: string, signal: AbortSignal, task: string, mockFixture?: T): Promise<string> {
  if (provider === "mock") {
    return mockFixture === undefined ? generateMockContent(task) : JSON.stringify(mockFixture)
  }
  if (provider === "groq") return generateGroqContent(system, user, signal)
  if (provider === "gemini") return generateGeminiContent(system, user, signal)
  throw new Error("Unknown provider")
}

function getModelNameFor(provider: string): string {
  if (provider === "mock") return "mock-model"
  if (provider === "groq") return env.GROQ_MODEL || "llama3-70b-8192"
  if (provider === "gemini") return env.GEMINI_MODEL || "gemini-1.5-flash"
  return "unknown"
}

function dlFail(code: string, message: string): Result<never, { code: string; message: string }> {
  return fail({ code, message })
}
