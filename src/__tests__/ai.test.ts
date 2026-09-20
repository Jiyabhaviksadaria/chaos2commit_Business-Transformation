import { describe, it, expect, vi, beforeEach, afterAll } from "vitest"
import { z } from "zod"
import { generateStructured } from "../lib/ai/orchestrator"
import { parseAndValidate, extractJsonFromText } from "../lib/ai/json"
import { buildProjectContext } from "../lib/ai/context"

// Mock environment and DB imports
vi.mock("@/env", () => ({
  env: {
    AI_MOCK: "true",
    GROQ_API_KEY: "test-groq",
    GEMINI_API_KEY: "test-gemini",
    GROQ_MODEL: "mocked-groq",
    GEMINI_MODEL: "mocked-gemini"
  }
}))

vi.mock("@/lib/db", () => ({
  db: {
    aiUsage: { create: vi.fn().mockResolvedValue({}) },
    project: {
      findUnique: vi.fn().mockResolvedValue({
        id: "proj-1",
        name: "Test Project",
        businessGoal: "Testing AI",
        documents: [
          { status: "READY", filename: "req.txt", extractedText: "A".repeat(20000) } // Over MAX_DOCUMENT_LENGTH
        ],
        deliverables: []
      })
    }
  }
}))

// We intercept global fetch to simulate API responses for Groq and Gemini
const originalFetch = global.fetch

describe("AI JSON extraction and validation", () => {
  it("extracts valid naked json", () => {
    const json = '{"key":"value"}'
    expect(extractJsonFromText(json)).toBe(json)
  })

  it("extracts json from markdown fences", () => {
    const raw = "Here is your JSON:\n```json\n{\"id\": 1}\n```\nHope it helps!"
    expect(extractJsonFromText(raw)).toBe('{"id": 1}')
  })

  it("extracts json even if trailing text exists", () => {
    const raw = "```\n{\"id\": 1}\n```\nsome text"
    expect(extractJsonFromText(raw)).toBe('{"id": 1}')
  })

  it("parses and validates successfully with Zod", () => {
    const schema = z.object({ id: z.number() })
    const result = parseAndValidate('{"id": 1}', schema)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.id).toBe(1)
  })

  it("returns generic error nicely on Zod failure", () => {
    const schema = z.object({ id: z.number() })
    const result = parseAndValidate('{"id": "string instead"}', schema)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_FAILED")
  })
})

describe("AI Orchestrator with mock fetch", () => {
  const schema = z.object({ mock_data: z.boolean(), message: z.string() })

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it("fails over safely when APIs are completely down to mock if enabled", async () => {
    // Force fetch to reject entirely
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"))

    const result = await generateStructured({
      task: "default",
      system: "Sys",
      user: "Usr",
      schema,
      language: "en"
    })

    // Groq fails, Gemini fails, hits mock correctly!
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider).toBe("mock")
      expect(result.data.data.mock_data).toBe(true)
    }
  })

  it("executes valid Groq natively when available", async () => {
    // Simulate successful JSON return from Groq
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"mock_data": true, "message": "Groq Win"}' } }] })
    } as unknown as Response)

    const result = await generateStructured({
      task: "default",
      system: "Sys",
      user: "Usr",
      schema,
      language: "en"
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider).toBe("groq")
      expect(result.data.data.message).toBe("Groq Win")
    }
  })

  it("repairs bad JSON correctly when provided", async () => {
    // Groq call 1: Returns broken JSON
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"mock_data": "wrong_type", "message": "Bad JSON"}' } }] })
    } as unknown as Response)
    
    // Groq call 2: Returns repaired valid JSON
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"mock_data": true, "message": "Repaired JSON"}' } }] })
    } as unknown as Response)

    const result = await generateStructured({
      task: "default",
      system: "Sys",
      user: "Usr",
      schema,
      language: "en"
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider).toBe("groq")
      expect(result.data.data.message).toBe("Repaired JSON")
    }
  })
})

describe("AI Context builder", () => {
  it("truncates extremely long documents keeping head and tail", async () => {
    const ctx = await buildProjectContext("proj-1", 15000)
    expect(ctx).toContain("[TRUNCATED]")
    expect(ctx.length).toBeLessThanOrEqual(15500) // global truncation boundary check (softly around 15k)
  })
})
