import { type ZodType } from "zod"
import { AiTaskStatus } from "@prisma/client"

import { Result, fail, ok } from "@/lib/result"
import { checkRateLimit } from "@/lib/ai/ratelimit"
import { parseAndValidate } from "@/lib/ai/json"
import { logAiUsage } from "@/lib/ai/usage"

export type AiProviderName = "openrouter" | "groq"

export type AiError = { code: string; message: string }

export type StructuredTransportRequest = {
  system: string
  user: string
  timeoutMs: number
}

/**
 * A transport is responsible only for returning raw JSON text for the given
 * system/user pair. Validation, repair, rate limiting, and usage logging are
 * handled once by `runStructuredGeneration`.
 */
export type StructuredTransport = (request: StructuredTransportRequest) => Promise<string>

export type StructuredRequest<T> = {
  task: string
  system: string
  user: string
  schema: ZodType<T>
  userId?: string
  organizationId?: string
  timeoutMs?: number
}

export type StructuredResult<T> = Result<
  { data: T; provider: AiProviderName; model: string },
  AiError
>

/** Thrown by a transport to surface a safe, user-facing provider failure. */
export class ProviderRequestError extends Error {
  public readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "ProviderRequestError"
    this.code = code
  }
}

export const DEFAULT_TIMEOUT_MS = 60_000

/**
 * Runs one schema-validated structured generation against the supplied
 * transport. On invalid output it makes exactly one bounded repair request and
 * never loops or partially applies a response.
 */
export async function runStructuredGeneration<T>(opts: {
  provider: AiProviderName
  model: string
  transport: StructuredTransport
  request: StructuredRequest<T>
}): Promise<StructuredResult<T>> {
  const { provider, model, transport, request } = opts

  if (request.userId) {
    const rateLimit = checkRateLimit(request.userId)
    if (!rateLimit.ok) return fail(rateLimit.error)
  }

  const startedAt = Date.now()
  const timeoutMs = request.timeoutMs || DEFAULT_TIMEOUT_MS
  const invalidCode = `${provider.toUpperCase()}_INVALID_RESPONSE`

  try {
    let raw = await transport({ system: request.system, user: request.user, timeoutMs })
    let parsed = parseAndValidate(raw, request.schema)

    if (!parsed.ok) {
      // One bounded repair request only; never loop or partially apply output.
      raw = await transport({
        system: request.system,
        user: `${request.user}\n\nThe previous response was invalid: ${parsed.error.message}\nReturn only corrected JSON matching the schema.`,
        timeoutMs,
      })
      parsed = parseAndValidate(raw, request.schema)
    }

    if (!parsed.ok) {
      throw new ProviderRequestError(parsed.error.code, parsed.error.message)
    }

    await logAiUsage({
      userId: request.userId,
      organizationId: request.organizationId,
      provider,
      model,
      task: request.task,
      latencyMs: Date.now() - startedAt,
      status: AiTaskStatus.SUCCESS,
    })
    return ok({ data: parsed.data, provider, model })
  } catch (error) {
    // A real provider/validation failure is surfaced. No synthetic content is
    // ever substituted, so the caller keeps the existing website intact.
    const safeError: AiError = error instanceof ProviderRequestError
      ? { code: error.code, message: error.message }
      : { code: invalidCode, message: "The AI provider could not complete the request." }

    await logAiUsage({
      userId: request.userId,
      organizationId: request.organizationId,
      provider,
      model,
      task: request.task,
      latencyMs: Date.now() - startedAt,
      status: AiTaskStatus.FALLBACK,
      error: safeError.code,
    })
    return fail(safeError)
  }
}
