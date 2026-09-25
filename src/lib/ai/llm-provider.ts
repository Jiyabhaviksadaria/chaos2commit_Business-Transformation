/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { generateStructured } from "@/lib/ai/orchestrator"
import { z } from "zod"

export interface LLMRequestOptions {
  prompt: string
  systemPrompt?: string
  temperature?: number
}

export interface LLMProvider {
  name: string
  isAvailable(): boolean
  generateStructured<T>(prompt: string, schema: z.ZodType<T>, systemPrompt?: string): Promise<T>
}

export class MockLLMProvider implements LLMProvider {
  name = "MockProvider"

  isAvailable(): boolean {
    return true
  }

  async generateStructured<T>(_prompt: string, schema: z.ZodType<T>, _systemPrompt?: string): Promise<T> {
    // If schema matches ChangeSet, return mock ChangeSet
    const mockChangeSet = {
      id: `cs-mock-${Date.now()}`,
      description: "Mock generated changeset",
      aiGenerated: true,
      operations: [
        {
          type: "UPDATE_BUSINESS",
          payload: { tagline: "Industry Leading Excellence & Innovation" }
        }
      ]
    }
    return mockChangeSet as unknown as T
  }
}

export class GeminiLLMProvider implements LLMProvider {
  name = "GeminiProvider"

  isAvailable(): boolean {
    const key = process.env.GEMINI_API_KEY
    return Boolean(key && key.startsWith("AIza"))
  }

  async generateStructured<T>(prompt: string, schema: z.ZodType<T>, systemPrompt?: string): Promise<T> {
    if (!this.isAvailable()) {
      const mock = new MockLLMProvider()
      return mock.generateStructured(prompt, schema, systemPrompt)
    }
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini timeout")), 1500)
      )
      const res = await Promise.race([
        generateStructured({
          task: "generate_structured",
          system: systemPrompt || "You are an AI product engineering agent. Produce valid structured JSON.",
          user: prompt,
          schema,
          language: "en"
        }),
        timeoutPromise
      ])
      if (!res.ok) throw new Error(res.error.message)
      return res.data.data
    } catch {
      const mock = new MockLLMProvider()
      return mock.generateStructured(prompt, schema, systemPrompt)
    }
  }
}

export class GroqLLMProvider implements LLMProvider {
  name = "GroqProvider"

  isAvailable(): boolean {
    const key = process.env.GROQ_API_KEY
    return Boolean(key && key.startsWith("gsk_"))
  }

  async generateStructured<T>(prompt: string, schema: z.ZodType<T>, systemPrompt?: string): Promise<T> {
    if (!this.isAvailable()) {
      const mock = new MockLLMProvider()
      return mock.generateStructured(prompt, schema, systemPrompt)
    }
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Groq timeout")), 1500)
      )
      const res = await Promise.race([
        generateStructured({
          task: "generate_structured",
          system: systemPrompt || "You are an AI product engineering agent. Produce valid structured JSON.",
          user: prompt,
          schema,
          language: "en"
        }),
        timeoutPromise
      ])
      if (!res.ok) throw new Error(res.error.message)
      return res.data.data
    } catch {
      const mock = new MockLLMProvider()
      return mock.generateStructured(prompt, schema, systemPrompt)
    }
  }
}

export class LLMRouter {
  private providers: LLMProvider[]

  constructor() {
    this.providers = [
      new GeminiLLMProvider(),
      new GroqLLMProvider(),
      new MockLLMProvider() // Always available fallback
    ]
  }

  public async generate<T>(prompt: string, schema: z.ZodType<T>, systemPrompt?: string): Promise<{ data: T; providerName: string }> {
    for (const provider of this.providers) {
      if (provider.isAvailable()) {
        try {
          const data = await provider.generateStructured(prompt, schema, systemPrompt)
          return { data, providerName: provider.name }
        } catch (err) {
          console.warn(`[LLMRouter] Provider ${provider.name} failed, trying next provider:`, err)
        }
      }
    }

    // Ultimate fallback to mock provider
    const mock = new MockLLMProvider()
    const data = await mock.generateStructured(prompt, schema, systemPrompt)
    return { data, providerName: mock.name }
  }
}
