import { env } from "@/env"

export async function generateGroqContent(system: string, user: string, abortSignal: AbortSignal): Promise<string> {
  const modelId = env.GROQ_MODEL || "llama3-70b-8192" // Check Groq model list for currently active models
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

export async function* groqChatStream(messages: {role: string, content: string}[], abortSignal: AbortSignal): AsyncIterable<string> {
  const modelId = env.GROQ_MODEL || "llama3-70b-8192"
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
      messages,
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
