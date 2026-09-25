import { describe, expect, it } from "vitest"
import { BUSINESS_COPILOT_SYSTEM_PROMPT } from "@/lib/ai/prompts/business-copilot"

describe("Business Copilot system instruction", () => {
  it("defines one adaptive multilingual instruction for free-form business conversations", () => {
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("AI Business Transformation Copilot")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("free-form natural-language")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("English, Hindi, Gujarati")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("Romanized Hindi")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("explicitly asks for a language")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("Do not force a formal Business Analysis template")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("clean Markdown")
    expect(BUSINESS_COPILOT_SYSTEM_PROMPT).toContain("Never invent business metrics")
  })
})
