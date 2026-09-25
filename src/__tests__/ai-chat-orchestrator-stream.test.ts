import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  groq: vi.fn(),
  gemini: vi.fn(),
  mock: vi.fn(),
  rateLimit: vi.fn(),
}))

vi.mock("@/env", () => ({
  env: {
    AI_MOCK: "true",
    GROQ_MODEL: "test-groq",
    GEMINI_MODEL: "test-gemini",
  },
}))

vi.mock("@/lib/ai/ratelimit", () => ({
  checkRateLimit: mocks.rateLimit,
}))

vi.mock("@/lib/ai/usage", () => ({
  logAiUsage: vi.fn(),
}))

vi.mock("@/lib/ai/providers/groq", () => ({
  generateGroqContent: vi.fn(),
  groqChatStream: mocks.groq,
}))

vi.mock("@/lib/ai/providers/gemini", () => ({
  generateGeminiContent: vi.fn(),
  geminiChatStream: mocks.gemini,
}))

vi.mock("@/lib/ai/providers/mock", () => ({
  generateMockContent: vi.fn(),
  mockChatStream: mocks.mock,
}))

import { chatStream } from "@/lib/ai/orchestrator"

function abortError(): Error {
  const error = new Error("aborted")
  error.name = "AbortError"
  return error
}

async function collect(stream: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe("chatStream lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimit.mockReturnValue({ ok: true })
    mocks.groq.mockImplementation(async function* () {
      yield "Groq "
    })
    mocks.gemini.mockImplementation(async function* () {
      yield "Gemini answer"
    })
    mocks.mock.mockImplementation(async function* () {
      yield "Mock answer"
    })
  })

  it("falls back before meaningful output and preserves the provider order", async () => {
    mocks.groq.mockImplementation(async function* () {
      throw new Error("provider unavailable before output")
    })

    await expect(collect(chatStream({ messages: [{ role: "user", content: "Question" }] }))).resolves.toEqual(["Gemini answer"])
    expect(mocks.gemini).toHaveBeenCalledTimes(1)
    expect(mocks.mock).not.toHaveBeenCalled()
  })

  it("does not concatenate a second provider after partial output", async () => {
    mocks.groq.mockImplementation(async function* () {
      yield "partial output"
      throw new Error("failed after output")
    })

    await expect(collect(chatStream({ messages: [{ role: "user", content: "Question" }] }))).rejects.toThrow("failed after output")
    expect(mocks.gemini).not.toHaveBeenCalled()
  })

  it("propagates an external abort signal to the active provider", async () => {
    let providerSignal: AbortSignal | undefined
    mocks.groq.mockImplementation(async function* (_messages: unknown, signal: AbortSignal) {
      providerSignal = signal
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
      throw abortError()
    })

    const controller = new AbortController()
    const pending = collect(chatStream({
      messages: [{ role: "user", content: "Question" }],
      signal: controller.signal,
    }))
    await vi.waitFor(() => expect(providerSignal).toBeDefined())
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
    expect(providerSignal?.aborted).toBe(true)
    expect(mocks.gemini).not.toHaveBeenCalled()
  })

  it("returns the rate-limit marker without calling a provider", async () => {
    mocks.rateLimit.mockReturnValue({ ok: false, error: { message: "limit" } })

    await expect(collect(chatStream({ messages: [], userId: "user-1" }))).resolves.toEqual(["Rate limit exceeded."])
    expect(mocks.groq).not.toHaveBeenCalled()
    expect(mocks.gemini).not.toHaveBeenCalled()
    expect(mocks.mock).not.toHaveBeenCalled()
  })
})
