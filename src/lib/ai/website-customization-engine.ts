/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { z } from "zod"
import { generateStructured } from "./orchestrator"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import type { Result } from "@/lib/result"
import { ok } from "@/lib/result"

export const WebsiteChangeTypeSchema = z.enum([
  "UPDATE_THEME",
  "UPDATE_COLORS",
  "UPDATE_TYPOGRAPHY",
  "ADD_SECTION",
  "REMOVE_SECTION",
  "UPDATE_SECTION",
  "TOGGLE_SECTION",
  "MOVE_SECTION",
  "UPDATE_NAVIGATION",
  "UPDATE_SEO",
  "UPDATE_LANGUAGE",
  "UPDATE_CONTENT",
  "UPDATE_CTA",
  "UPDATE_FOOTER"
])

export type WebsiteChangeType = z.infer<typeof WebsiteChangeTypeSchema>

export const WebsiteChangeItemSchema = z.object({
  type: WebsiteChangeTypeSchema,
  sectionId: z.string().optional(),
  sectionType: z.string().optional(),
  theme: z.object({
    style: z.enum(["MODERN", "CLASSIC", "BOLD"]).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    accentColor: z.string().optional()
  }).optional(),
  section: z.object({
    id: z.string().optional(),
    type: z.string(),
    visible: z.boolean().optional(),
    order: z.number().optional(),
    title: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
    ctaLabel: z.string().optional(),
    body: z.string().optional(),
    text: z.string().optional(),
    items: z.array(z.any()).optional(),
    steps: z.array(z.any()).optional()
  }).optional(),
  targetIndex: z.number().optional(),
  visible: z.boolean().optional(),
  nav: z.array(z.string()).optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).optional(),
  language: z.string().optional(),
  content: z.record(z.string(), z.any()).optional()
})

export type WebsiteChangeItem = z.infer<typeof WebsiteChangeItemSchema>

export const WebsiteDeltaSchema = z.object({
  summary: z.string(),
  changes: z.array(WebsiteChangeItemSchema),
  affectedSections: z.array(z.string()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW")
})

export type WebsiteDelta = z.infer<typeof WebsiteDeltaSchema>

/**
 * Calculates risk level based on requested website changes.
 */
export function calculateWebsiteRiskLevel(changes: WebsiteChangeItem[]): "LOW" | "MEDIUM" | "HIGH" {
  let hasHigh = false
  let hasMedium = false

  for (const c of changes) {
    if (c.type === "REMOVE_SECTION") {
      hasHigh = true
    } else if (c.type === "UPDATE_LANGUAGE" || c.type === "UPDATE_THEME") {
      hasMedium = true
    }
  }

  if (hasHigh) return "HIGH"
  if (hasMedium) return "MEDIUM"
  return "LOW"
}

/**
 * AI-driven generation of a structured Website Delta.
 */
export async function generateWebsiteDelta(
  currentSpec: WebsiteSpecData,
  prompt: string,
  modelId?: string
): Promise<Result<WebsiteDelta>> {
  if (!prompt || !prompt.trim()) {
    return { ok: false, error: new Error("Customization prompt cannot be empty") }
  }

  const systemPrompt = `You are an expert AI web designer and frontend customization engine.
Analyze the user's natural language customization request and the current website spec.
Return a structured JSON Website Delta detailing exact changes to apply.
Supported change types: UPDATE_THEME, UPDATE_COLORS, UPDATE_TYPOGRAPHY, ADD_SECTION, REMOVE_SECTION, UPDATE_SECTION, TOGGLE_SECTION, MOVE_SECTION, UPDATE_NAVIGATION, UPDATE_SEO, UPDATE_LANGUAGE, UPDATE_CONTENT, UPDATE_CTA, UPDATE_FOOTER.
Available section types: hero, about, services, process, testimonials, faq, contact, footer.
If language translation is requested (e.g. Hindi, Spanish, Gujarati, Arabic), set UPDATE_LANGUAGE and translate section titles and text content appropriately.
Output MUST match the requested schema exactly.`

  const userPrompt = `Current Website Spec:
${JSON.stringify(currentSpec, null, 2)}

User Customization Request:
"${prompt}"

Generate the structured Website Delta.`

  try {
    const res = await generateStructured<WebsiteDelta>({
      task: "WEBSITE_CUSTOMIZATION",
      system: systemPrompt,
      user: userPrompt,
      schema: WebsiteDeltaSchema,
      language: currentSpec.language || "en"
    })
    if (res.ok) {
      return ok(res.data.data)
    }
    return ok(createFallbackWebsiteDelta(currentSpec, prompt))
  } catch (err) {
    console.warn("[WebsiteCustomizationEngine] AI generation failed, using fallback:", err)
    return ok(createFallbackWebsiteDelta(currentSpec, prompt))
  }
}

/**
 * Deterministically creates a fallback Website Delta for common request prompts.
 */
export function createFallbackWebsiteDelta(currentSpec: WebsiteSpecData, prompt: string): WebsiteDelta {
  const lowerPrompt = prompt.toLowerCase()
  const changes: WebsiteChangeItem[] = []
  const affected: string[] = []

  // Check for theme / color changes
  if (lowerPrompt.includes("dark navy") || lowerPrompt.includes("dark mode") || lowerPrompt.includes("theme") || lowerPrompt.includes("color")) {
    const isNavy = lowerPrompt.includes("navy")
    changes.push({
      type: "UPDATE_THEME",
      theme: {
        style: "MODERN",
        primaryColor: isNavy ? "#0B1F3A" : "#1E293B",
        secondaryColor: "#3B82F6",
        backgroundColor: isNavy ? "#07111F" : "#0F172A",
        textColor: "#FFFFFF"
      }
    })
    affected.push("theme")
  }

  // Check for FAQ section
  if (lowerPrompt.includes("faq") || lowerPrompt.includes("question") || lowerPrompt.includes("frequently asked")) {
    changes.push({
      type: "ADD_SECTION",
      section: {
        id: "faq",
        type: "faq",
        visible: true,
        title: "Frequently Asked Questions",
        items: [
          { q: "What services do you provide?", a: "We provide comprehensive business transformation and digital platform builds." },
          { q: "How long does implementation take?", a: "Most projects are completed within 2 to 4 weeks." },
          { q: "Do you offer support?", a: "Yes, 24/7 technical and strategic support is included." }
        ]
      }
    })
    affected.push("faq")
  }

  // Check for language translation
  if (lowerPrompt.includes("hindi") || lowerPrompt.includes("gujarati") || lowerPrompt.includes("spanish") || lowerPrompt.includes("arabic") || lowerPrompt.includes("french")) {
    let lang = "en"
    if (lowerPrompt.includes("hindi")) lang = "hi"
    else if (lowerPrompt.includes("gujarati")) lang = "gu"
    else if (lowerPrompt.includes("spanish")) lang = "es"
    else if (lowerPrompt.includes("arabic")) lang = "ar"
    else if (lowerPrompt.includes("french")) lang = "fr"

    changes.push({
      type: "UPDATE_LANGUAGE",
      language: lang
    })
    affected.push("language")
  }

  // Generic fallback if no specific keywords matched
  if (changes.length === 0) {
    const heroSec = currentSpec.sections.find(s => s.type === "hero") as any
    const headlineText = heroSec?.headline || "Transform Your Business"

    changes.push({
      type: "UPDATE_CONTENT",
      sectionType: "hero",
      section: {
        type: "hero",
        subheadline: `${headlineText} — ${prompt}`
      }
    })
    affected.push("hero")
  }

  return {
    summary: `Customization based on request: "${prompt}"`,
    changes,
    affectedSections: Array.from(new Set(affected)),
    riskLevel: calculateWebsiteRiskLevel(changes)
  }
}

/**
 * Deterministically applies a Website Delta onto a base WebsiteSpecData object.
 */
export function applyWebsiteDelta(baseSpec: WebsiteSpecData, delta: WebsiteDelta): WebsiteSpecData {
  const spec: WebsiteSpecData = JSON.parse(JSON.stringify(baseSpec))

  if (!spec.sections) spec.sections = []
  if (!spec.theme) spec.theme = { primary: "#3B82F6", style: "MODERN" }

  for (const change of delta.changes) {
    switch (change.type) {
      case "UPDATE_THEME":
      case "UPDATE_COLORS":
      case "UPDATE_TYPOGRAPHY": {
        if (change.theme) {
          if (change.theme.style) spec.theme.style = change.theme.style
          if (change.theme.primaryColor) {
            spec.theme.primary = change.theme.primaryColor
            spec.theme.primaryColor = change.theme.primaryColor
          }
          if (change.theme.secondaryColor) spec.theme.secondaryColor = change.theme.secondaryColor
          if (change.theme.backgroundColor) spec.theme.backgroundColor = change.theme.backgroundColor
          if (change.theme.textColor) spec.theme.textColor = change.theme.textColor
          if (change.theme.accentColor) spec.theme.accentColor = change.theme.accentColor
        }
        break
      }

      case "ADD_SECTION": {
        if (change.section && change.section.type) {
          const newSec = {
            id: change.section.id || `${change.section.type}_${Date.now()}`,
            order: spec.sections.length + 1,
            visible: change.section.visible !== false,
            ...change.section
          }
          // Remove existing section of same type if not allowing duplicates or append
          const existingIdx = spec.sections.findIndex(s => (s.id && s.id === newSec.id) || s.type === newSec.type)
          if (existingIdx >= 0) {
            spec.sections[existingIdx] = { ...spec.sections[existingIdx], ...newSec }
          } else {
            // Insert before footer if footer exists
            const footerIdx = spec.sections.findIndex(s => s.type === "footer")
            if (footerIdx >= 0) {
              spec.sections.splice(footerIdx, 0, newSec as any)
            } else {
              spec.sections.push(newSec as any)
            }
          }
        }
        break
      }

      case "REMOVE_SECTION": {
        const targetId = change.sectionId || change.sectionType
        if (targetId) {
          spec.sections = spec.sections.filter(s => s.id !== targetId && s.type !== targetId)
        }
        break
      }

      case "UPDATE_SECTION":
      case "UPDATE_CONTENT":
      case "UPDATE_CTA":
      case "UPDATE_FOOTER": {
        const target = change.sectionId || change.sectionType || change.section?.type
        if (target) {
          const idx = spec.sections.findIndex(s => s.id === target || s.type === target)
          if (idx >= 0 && change.section) {
            spec.sections[idx] = { ...spec.sections[idx], ...change.section }
          }
        }
        break
      }

      case "TOGGLE_SECTION": {
        const target = change.sectionId || change.sectionType
        if (target && change.visible !== undefined) {
          const idx = spec.sections.findIndex(s => s.id === target || s.type === target)
          if (idx >= 0) {
            spec.sections[idx].visible = change.visible
          }
        }
        break
      }

      case "MOVE_SECTION": {
        const target = change.sectionId || change.sectionType
        if (target && change.targetIndex !== undefined) {
          const idx = spec.sections.findIndex(s => s.id === target || s.type === target)
          if (idx >= 0 && change.targetIndex >= 0 && change.targetIndex < spec.sections.length) {
            const [item] = spec.sections.splice(idx, 1)
            spec.sections.splice(change.targetIndex, 0, item)
          }
        }
        break
      }

      case "UPDATE_NAVIGATION": {
        if (change.nav) {
          spec.nav = change.nav
        }
        break
      }

      case "UPDATE_SEO": {
        if (change.seo) {
          spec.seo = {
            title: change.seo.title || spec.seo.title,
            description: change.seo.description || spec.seo.description,
            keywords: change.seo.keywords || spec.seo.keywords
          }
        }
        break
      }

      case "UPDATE_LANGUAGE": {
        if (change.language) {
          spec.language = change.language
          if (change.language === "ar") {
            spec.dir = "rtl"
          } else {
            spec.dir = "ltr"
          }
        }
        break
      }
    }
  }

  // Ensure sections order property is updated
  spec.sections.forEach((sec, idx) => {
    sec.order = idx + 1
    if (sec.visible === undefined) sec.visible = true
  })

  return spec
}

/**
 * Deterministic manual section helper: add section
 */
export function addSectionToSpec(spec: WebsiteSpecData, section: any): WebsiteSpecData {
  const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
  const newSec = {
    id: section.id || `${section.type}_${Date.now()}`,
    order: updated.sections.length + 1,
    visible: true,
    ...section
  }
  const footerIdx = updated.sections.findIndex(s => s.type === "footer")
  if (footerIdx >= 0) {
    updated.sections.splice(footerIdx, 0, newSec)
  } else {
    updated.sections.push(newSec)
  }
  return updated
}

/**
 * Deterministic manual section helper: remove section
 */
export function removeSectionFromSpec(spec: WebsiteSpecData, identifier: string): WebsiteSpecData {
  const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
  updated.sections = updated.sections.filter(s => s.id !== identifier && s.type !== identifier)
  return updated
}

/**
 * Deterministic manual section helper: toggle section visibility
 */
export function toggleSectionVisibilityInSpec(spec: WebsiteSpecData, identifier: string, visible?: boolean): WebsiteSpecData {
  const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
  const target = updated.sections.find(s => s.id === identifier || s.type === identifier)
  if (target) {
    target.visible = visible !== undefined ? visible : !target.visible
  }
  return updated
}

/**
 * Deterministic manual section helper: reorder section
 */
export function reorderSectionsInSpec(spec: WebsiteSpecData, fromIndex: number, toIndex: number): WebsiteSpecData {
  const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
  if (fromIndex >= 0 && fromIndex < updated.sections.length && toIndex >= 0 && toIndex < updated.sections.length) {
    const [moved] = updated.sections.splice(fromIndex, 1)
    updated.sections.splice(toIndex, 0, moved)
    updated.sections.forEach((s, idx) => { s.order = idx + 1 })
  }
  return updated
}

/**
 * Deterministic manual theme helper
 */
export function updateThemeInSpec(spec: WebsiteSpecData, themePartial: any): WebsiteSpecData {
  const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
  updated.theme = { ...updated.theme, ...themePartial }
  if (themePartial.primary) {
    updated.theme.primaryColor = themePartial.primary
  }
  return updated
}
