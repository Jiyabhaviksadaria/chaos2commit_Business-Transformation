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

  // Very basic stream reader
  if (!response.body) return
  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n").filter(l => l.trim() !== "")
    for (const line of lines) {
      if (line === "data: [DONE]") return
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6))
          const content = data.choices[0]?.delta?.content
          if (content) yield content
        } catch {
          // ignore parse errors mid-stream
        }
      }
    }
  }
}
