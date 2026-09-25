import { env } from "@/env"

export async function generateGeminiContent(system: string, user: string, abortSignal: AbortSignal): Promise<string> {
  const modelId = env.GEMINI_MODEL || "gemini-1.5-flash" // Check Gemini model list for active names
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: abortSignal,
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: user }] }
      ],
      systemInstruction: {
        parts: [{ text: system }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null
}

function extractGeminiText(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) extractGeminiText(item, output)
    return output
  }
  if (!isRecord(value)) return output

  const candidates = value.candidates
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) extractGeminiText(candidate, output)
  }

  const content = value.content
  if (isRecord(content) && Array.isArray(content.parts)) {
    for (const part of content.parts) {
      if (isRecord(part) && typeof part.text === "string") output.push(part.text)
    }
  }
  return output
}

function findJsonEnd(buffer: string, start: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < buffer.length; index += 1) {
    const character = buffer[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }

    if (character === '"') {
      inString = true
      continue
    }
    if (character === "{" || character === "[") depth += 1
    if (character === "}" || character === "]") {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function consumeGeminiJson(buffer: string): { texts: string[]; rest: string } {
  const texts: string[] = []
  let cursor = 0

  while (cursor < buffer.length) {
    while (cursor < buffer.length && /\s/.test(buffer[cursor])) cursor += 1
    if (buffer.startsWith("data:", cursor)) {
      cursor += 5
      while (cursor < buffer.length && buffer[cursor] === " ") cursor += 1
    }
    if (cursor >= buffer.length) return { texts, rest: "" }
    if (buffer[cursor] !== "{" && buffer[cursor] !== "[") {
      return { texts, rest: buffer.slice(cursor) }
    }

    const end = findJsonEnd(buffer, cursor)
    if (end === -1) return { texts, rest: buffer.slice(cursor) }
    try {
      texts.push(...extractGeminiText(JSON.parse(buffer.slice(cursor, end + 1)) as unknown))
    } catch {
      // Ignore malformed provider frames and continue with the next complete frame.
    }
    cursor = end + 1
  }

  return { texts, rest: "" }
}

export type GeminiChatMessage = { role: string; content: string }

/**
 * Gemini takes the instruction outside `contents` and calls assistant turns
 * `model` turns. A persisted SYSTEM role is never converted into a user turn.
 * Consecutive same-role turns are joined so provider-side role validation does
 * not lose context when an older chat contains an incomplete turn.
 */
export function formatGeminiMessages(messages: GeminiChatMessage[]): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  const formatted: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = []

  for (const message of messages) {
    if (message.role === "system") continue
    const role = message.role === "assistant" ? "model" : "user"
    const previous = formatted[formatted.length - 1]
    if (previous?.role === role) {
      previous.parts[0].text += `\n\n${message.content}`
    } else {
      formatted.push({ role, parts: [{ text: message.content }] })
    }
  }

  return formatted
}

// Keep the original (messages, signal[, system]) form for existing callers and
// also accept (system, messages, signal) for callers that prefer the provider
// instruction first.
export function geminiChatStream(messages: GeminiChatMessage[], abortSignal: AbortSignal, system?: string): AsyncIterable<string>
export function geminiChatStream(system: string | undefined, messages: GeminiChatMessage[], abortSignal: AbortSignal): AsyncIterable<string>
export async function* geminiChatStream(
  messagesOrSystem: GeminiChatMessage[] | string | undefined,
  abortSignalOrMessages: AbortSignal | GeminiChatMessage[],
  systemOrAbortSignal?: string | AbortSignal,
): AsyncIterable<string> {
  const systemFirst = Array.isArray(abortSignalOrMessages)
  const messages = (systemFirst ? abortSignalOrMessages : messagesOrSystem) as GeminiChatMessage[]
  const abortSignal = (systemFirst ? systemOrAbortSignal : abortSignalOrMessages) as AbortSignal
  const system = systemFirst
    ? typeof messagesOrSystem === "string" ? messagesOrSystem : undefined
    : typeof systemOrAbortSignal === "string" ? systemOrAbortSignal : undefined

  const modelId = env.GEMINI_MODEL || "gemini-1.5-flash"
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const persistedSystem = messages.find((message) => message.role === "system")?.content
  const effectiveSystem = system ?? persistedSystem

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: abortSignal,
    body: JSON.stringify({
      contents: formatGeminiMessages(messages),
      ...(effectiveSystem?.trim() ? { systemInstruction: { parts: [{ text: effectiveSystem }] } } : {}),
      generationConfig: {
        temperature: 0.7
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}`)
  }

  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const parsed = consumeGeminiJson(buffer)
      buffer = parsed.rest
      for (const text of parsed.texts) {
        if (text) yield text
      }
      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}
