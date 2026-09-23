import { describe, it, expect } from "vitest"
import { AIRequestRouter } from "@/lib/ai/request-router"
import { LLMRouter } from "@/lib/ai/llm-provider"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 3: AI Request Router & LLM Provider Abstraction", () => {
  it("Level 0 requests MUST be handled deterministically with ZERO LLM calls", async () => {
    const spec = buildWebsiteSpecFromTemplate("clinic")
    const router = new AIRequestRouter()

    // 1. Rename request
    const res1 = await router.routeRequest("change name to Horizon Dental Clinic", spec)
    expect(res1.level).toBe(0)
    expect(res1.llmCallsMade).toBe(0)
    expect(res1.changeSet.operations[0].type).toBe("UPDATE_BUSINESS")
    expect(res1.changeSet.operations[0].payload.name).toBe("Horizon Dental Clinic")

    // 2. Theme color request
    const res2 = await router.routeRequest("change theme color to teal", spec)
    expect(res2.level).toBe(0)
    expect(res2.llmCallsMade).toBe(0)
    expect(res2.changeSet.operations[0].type).toBe("UPDATE_THEME")
    expect(res2.changeSet.operations[0].payload.primary).toBe("#0D9488")

    // 3. Hide section request
    const res3 = await router.routeRequest("hide faq section", spec)
    expect(res3.level).toBe(0)
    expect(res3.llmCallsMade).toBe(0)
    expect(res3.changeSet.operations[0].type).toBe("TOGGLE_SECTION")
    expect(res3.changeSet.operations[0].targetId).toBe("faq")
  })

  it("Level 1 & Level 2 requests should route through LLMRouter fallback gracefully", async () => {
    const spec = buildWebsiteSpecFromTemplate("restaurant")
    const router = new AIRequestRouter()

    const res = await router.routeRequest("make this a premium Michelin star steakhouse with fine wine pairing", spec)
    expect(res.level).toBe(1)
    expect(res.llmCallsMade).toBe(1)
    expect(res.changeSet).toBeDefined()
    expect(res.changeSet.operations.length).toBeGreaterThan(0)
  })

  it("LLMRouter should fallback across providers gracefully", async () => {
    const llmRouter = new LLMRouter()
    const { z } = await import("zod")
    const schema = z.object({ id: z.string(), description: z.string(), aiGenerated: z.boolean(), operations: z.array(z.any()) })
    const result = await llmRouter.generate("test prompt", schema)
    expect(result.data).toBeDefined()
    expect(result.providerName).toBeDefined()
  })
})
