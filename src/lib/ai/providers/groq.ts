import { env } from "@/env"

export async function generateGroqContent(system: string, user: string, abortSignal: AbortSignal): Promise<string> {
  const modelId = env.GROQ_MODEL || "openai/gpt-oss-120b"
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not set")

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: abortSignal,
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq API error ${response.status}: ${errText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

export type GroqChatMessage = { role: string; content: string }

// Keep the original (messages, signal[, system]) form for existing callers and
// also accept (system, messages, signal) for callers that prefer the provider
// instruction first. The request sent to Groq is always normalized below.
export function groqChatStream(messages: GroqChatMessage[], abortSignal: AbortSignal, system?: string): AsyncIterable<string>
export function groqChatStream(system: string | undefined, messages: GroqChatMessage[], abortSignal: AbortSignal): AsyncIterable<string>
export async function* groqChatStream(
  messagesOrSystem: GroqChatMessage[] | string | undefined,
  abortSignalOrMessages: AbortSignal | GroqChatMessage[],
  systemOrAbortSignal?: string | AbortSignal,
): AsyncIterable<string> {
  const systemFirst = Array.isArray(abortSignalOrMessages)
  const messages = (systemFirst ? abortSignalOrMessages : messagesOrSystem) as GroqChatMessage[]
  const abortSignal = (systemFirst ? systemOrAbortSignal : abortSignalOrMessages) as AbortSignal
  const system = systemFirst
    ? typeof messagesOrSystem === "string" ? messagesOrSystem : undefined
    : typeof systemOrAbortSignal === "string" ? systemOrAbortSignal : undefined

  const modelId = env.GROQ_MODEL || "openai/gpt-oss-120b"
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) throw new Error("GROQ_API_KEY is not set")

  const persistedSystem = messages.find((message) => message.role === "system")?.content
  const effectiveSystem = system ?? persistedSystem
  const providerMessages = [
    ...(effectiveSystem?.trim() ? [{ role: "system", content: effectiveSystem }] : []),
    ...messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role, content: message.content })),
  ]

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: abortSignal,
    body: JSON.stringify({
      model: modelId,
      messages: providerMessages,
      stream: true,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    throw new Error(`Groq API error ${response.status}`)
  }

  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  const parseLine = (line: string): { done: boolean; content?: string } | null => {
    const trimmed = line.trim()
    if (!trimmed) return null
    if (trimmed === "data: [DONE]") return { done: true }
    if (!trimmed.startsWith("data:")) return null

    const rawData = trimmed.slice(5).trimStart()
    try {
      const data = JSON.parse(rawData) as { choices?: Array<{ delta?: { content?: string } }> }
      const content = data.choices?.[0]?.delta?.content
      return content ? { done: false, content } : null
    } catch {
      // A complete JSON event can still be malformed; ignore it like the
      // previous implementation did rather than failing a healthy stream.
      return null
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = done ? "" : lines.pop() ?? ""

      for (const line of lines) {
        const result = parseLine(line)
        if (result?.done) return
        if (result?.content) yield result.content
      }

      if (done) {
        if (buffer.trim()) {
          const result = parseLine(buffer)
          if (result?.done) return
          if (result?.content) yield result.content
        }
        break
      }
    }
  } finally {
    reader.releaseLock()
  }
}
