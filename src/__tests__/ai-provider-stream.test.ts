import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/env", () => ({
  env: {
    GROQ_API_KEY: "test-groq-key",
    GEMINI_API_KEY: "test-gemini-key",
    GROQ_MODEL: "test-groq-model",
    GEMINI_MODEL: "test-gemini-model",
  },
}))

import { formatGeminiMessages, geminiChatStream } from "@/lib/ai/providers/gemini"
import { groqChatStream } from "@/lib/ai/providers/groq"

const system = "You are the AI Business Transformation Copilot."

function responseWithBody(body: string): Response {
  return new Response(body, { status: 200 })
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let result = ""
  for await (const chunk of stream) result += chunk
  return result
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("streaming provider request shapes", () => {
  it("sends the Business Copilot instruction as Groq's leading system message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      responseWithBody('data: {"choices":[{"delta":{"content":"answer"}}]}\n\ndata: [DONE]\n\n'),
    )

    await expect(collect(groqChatStream(
      system,
      [
        { role: "user", content: "Explain inventory" },
        { role: "assistant", content: "Earlier answer" },
        { role: "user", content: "What about the technical side?" },
      ],
      new AbortController().signal,
    ))).resolves.toBe("answer")

    const request = vi.mocked(fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(request?.signal).toBeInstanceOf(AbortSignal)
    expect(body.messages).toEqual([
      { role: "system", content: system },
      { role: "user", content: "Explain inventory" },
      { role: "assistant", content: "Earlier answer" },
      { role: "user", content: "What about the technical side?" },
    ])
  })

  it("sends the instruction through Gemini systemInstruction and preserves role order", async () => {
    vi.mocked(fetch).mockResolvedValue(
      responseWithBody(JSON.stringify({ candidates: [{ content: { parts: [{ text: "answer" }] } }] })),
    )

    await expect(collect(geminiChatStream(
      system,
      [
        { role: "user", content: "Analyze inventory" },
        { role: "assistant", content: "Earlier answer" },
        { role: "user", content: "Give me the gaps" },
      ],
      new AbortController().signal,
    ))).resolves.toBe("answer")

    const request = vi.mocked(fetch).mock.calls[0][1]
    const body = JSON.parse(String(request?.body))
    expect(body.systemInstruction).toEqual({ parts: [{ text: system }] })
    expect(body.contents).toEqual([
      { role: "user", parts: [{ text: "Analyze inventory" }] },
      { role: "model", parts: [{ text: "Earlier answer" }] },
      { role: "user", parts: [{ text: "Give me the gaps" }] },
    ])
    expect(body.contents).not.toContainEqual(expect.objectContaining({ role: "system" }))
  })

  it("does not turn persisted system turns into Gemini user turns and merges adjacent user turns", () => {
    expect(formatGeminiMessages([
      { role: "user", content: "First" },
      { role: "system", content: "Do not persist this" },
      { role: "user", content: "Follow-up" },
    ])).toEqual([
      { role: "user", parts: [{ text: "First\n\nFollow-up" }] },
    ])
  })
})
