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
        role: "user",
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

export async function* geminiChatStream(messages: {role: string, content: string}[], abortSignal: AbortSignal): AsyncIterable<string> {
  const modelId = env.GEMINI_MODEL || "gemini-1.5-flash"
  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")

  const formattedMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }))

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    signal: abortSignal,
    body: JSON.stringify({
      contents: formattedMessages,
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

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    // Gemini stream chunks are JSON arrays of blocks or parts of it
    // A robust stream parser requires aggregating the JSON buffers, but for a simple chat implementation:
    try {
      // Find candidate parts using regex exec to avoid downlevelIteration errors
      const regex = /"text":\s*"([^"\\]*(\\.[^"\\]*)*)"/g
      let match;
      while ((match = regex.exec(chunk)) !== null) {
        if (match[1]) {
          // crude unescaping
          yield match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
        }
      }
    } catch {
      // Ignore parse boundaries errors
    }
  }
}
