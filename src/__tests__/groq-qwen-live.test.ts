import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Loads the project `.env` into process.env using the same "first entry wins"
 * rule that Next.js applies, so this live check exercises the real
 * configuration rather than a mock.
 */
function loadDotEnvFirstWins(): void {
  const file = path.resolve(process.cwd(), ".env")
  if (!fs.existsSync(file)) return
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) value = value.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = value
  }
}

loadDotEnvFirstWins()

const GROQ_CONFIGURED = Boolean(process.env.GROQ_API_KEY)
// Live calls hit a real provider with a small per-minute token budget, so they
// are opt-in and never part of the default `npm test` run. Enable with:
//   RUN_GROQ_LIVE_TESTS=1 npx vitest run src/__tests__/groq-qwen-live.test.ts
// Allow roughly 60s between the two translation cases.
const LIVE_ENABLED = GROQ_CONFIGURED && process.env.RUN_GROQ_LIVE_TESTS === "1"
const DEVANAGARI = /[\u0900-\u097F]/
const GUJARATI = /[\u0A80-\u0AFF]/

/** Imported lazily so `@/env` observes the values loaded above. */
async function loadProvider() {
  return {
    groq: await import("@/lib/ai/groq-qwen"),
    templates: await import("@/lib/templates/template-registry"),
  }
}

describe.skipIf(!LIVE_ENABLED)("live Groq Qwen generation", () => {
  it("uses the Qwen model resolved from the real GROQ_MODEL", async () => {
    const { groq } = await loadProvider()
    expect(groq.groqQwenModel()).toBe("qwen/qwen3.8-27b")
  }, 30_000)

  it("generates real Devanagari Hindi content for targetLanguage hi", async () => {
    const { groq, templates } = await loadProvider()
    const english = templates.buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")

    const result = await groq.generateMultilingualWebsiteTranslation({
      sourceSpec: english,
      sourceLanguage: "en",
      targetLanguage: "hi",
    })

    if (!result.ok) throw new Error(`hi failed: ${result.error.code} ${result.error.message}`)
    const out = result.data.data
    console.log("[HI] provider/model:", result.data.provider, result.data.model)
    console.log("[HI] siteName:", out.siteName)
    console.log("[HI] nav:", JSON.stringify(out.nav))
    console.log("[HI] seo.title:", out.seo.title)
    console.log("[HI] hero.headline:", JSON.stringify((out.sections?.[0] as { headline?: string } | undefined)?.headline))

    expect(result.data.provider).toBe("groq")
    expect(result.data.model).toBe("qwen/qwen3.8-27b")
    // Brand names are intentionally preserved verbatim, so assert on the
    // user-facing content that must actually be translated.
    expect(out.nav.join(" ")).toMatch(DEVANAGARI)
    expect(JSON.stringify(out.sections)).toMatch(DEVANAGARI)
  }, 120_000)

  it("generates real Gujarati-script content for targetLanguage gu", async () => {
    const { groq, templates } = await loadProvider()
    const english = templates.buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")

    const result = await groq.generateMultilingualWebsiteTranslation({
      sourceSpec: english,
      sourceLanguage: "en",
      targetLanguage: "gu",
    })

    if (!result.ok) throw new Error(`gu failed: ${result.error.code} ${result.error.message}`)
    const out = result.data.data
    console.log("[GU] provider/model:", result.data.provider, result.data.model)
    console.log("[GU] siteName:", out.siteName)
    console.log("[GU] nav:", JSON.stringify(out.nav))
    console.log("[GU] seo.title:", out.seo.title)
    console.log("[GU] hero.headline:", JSON.stringify((out.sections?.[0] as { headline?: string } | undefined)?.headline))

    expect(result.data.provider).toBe("groq")
    expect(out.nav.join(" ")).toMatch(GUJARATI)
    expect(JSON.stringify(out.sections)).toMatch(GUJARATI)
  }, 120_000)

  it("applies a Hinglish design instruction to a validated ChangeSet", async () => {
    const { groq, templates } = await loadProvider()
    const english = templates.buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")

    const result = await groq.runAIDesignAssistant({
      prompt: "Hero ka heading bada kar do.",
      currentSpec: english,
      selectedLanguage: "en",
      assistantLanguage: "hi",
      projectName: "Bright Smile Clinic",
      currentSection: "hero",
    })

    if (!result.ok) throw new Error(`assistant failed: ${result.error.code} ${result.error.message}`)
    console.log("[ASSISTANT hi] ops:", JSON.stringify(result.data.data.operations))
    console.log("[ASSISTANT hi] message:", result.data.data.message)
    expect(result.data.data.operations.length).toBeGreaterThan(0)
  }, 120_000)

  it("applies a Gujlish design instruction to a validated ChangeSet", async () => {
    const { groq, templates } = await loadProvider()
    const english = templates.buildWebsiteSpecFromTemplate("clinic", "Bright Smile Clinic")

    const result = await groq.runAIDesignAssistant({
      prompt: "Hero section nu heading motu kari do.",
      currentSpec: english,
      selectedLanguage: "gu",
      assistantLanguage: "gu",
      projectName: "Bright Smile Clinic",
      currentSection: "hero",
    })

    if (!result.ok) throw new Error(`assistant failed: ${result.error.code} ${result.error.message}`)
    console.log("[ASSISTANT gu] ops:", JSON.stringify(result.data.data.operations))
    console.log("[ASSISTANT gu] message:", result.data.data.message)
    expect(result.data.data.operations.length).toBeGreaterThan(0)
  }, 120_000)
})
