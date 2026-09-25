import { NextResponse } from "next/server"
import { z } from "zod"

import { requireProjectAccess } from "@/lib/access"
import { runAIDesignAssistant } from "@/lib/ai/groq-qwen"
import { assistantClarification, assistantConfirmation, getAssistantLanguage } from "@/lib/ai/instruction-language"
import { ChangeSetValidator, type ChangeSet } from "@/lib/changeset/changeset-validator"
import { getProjectLanguageConfig } from "@/lib/i18n/website-languages"
import { WebsiteSpecSchema, type WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { getWebsiteLocaleStatus, resolveWebsiteLocale } from "@/lib/website/localized-spec"

const EditorAssistantSchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
  spec: z.unknown(),
  selectedLanguage: z.enum(["en", "hi", "gu"]),
  currentSection: z.string().max(100).optional(),
  projectName: z.string().max(160).optional(),
})

const CONTENT_KEYS: Record<string, readonly string[]> = {
  hero: ["headline", "subheadline", "ctaLabel", "ctaColor", "fontSize"],
  about: ["title", "body"],
  services: ["title", "items"],
  process: ["title", "steps"],
  testimonials: ["title", "items"],
  faq: ["title", "items"],
  contact: ["title", "body"],
  footer: ["text"],
}

const THEME_KEYS = new Set(["primary", "primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor", "fontFamily", "borderRadius", "buttonStyle", "style"])
const BUSINESS_KEYS = new Set(["name", "phone", "email", "address"])
const COLOR_KEYS = new Set(["primary", "primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor"])

function isValidContentArray(sectionType: string, value: unknown): boolean {
  if (!Array.isArray(value)) return false
  return value.every((item) => {
    if (!item || typeof item !== "object") return false
    const record = item as Record<string, unknown>
    if (sectionType === "testimonials") return typeof record.name === "string" && typeof record.quote === "string"
    if (sectionType === "faq") return typeof record.q === "string" && typeof record.a === "string"
    if (sectionType === "services") return typeof record.title === "string" && typeof record.description === "string"
    if (sectionType === "process") return typeof record.title === "string" && typeof record.description === "string"
    return true
  })
}

function validateAssistantChangeSet(changeSet: ChangeSet, currentSpec: WebsiteSpecData) {
  const base = ChangeSetValidator.validate(changeSet, currentSpec)
  const errors = [...base.errors]
  if (changeSet.operations.length === 0) errors.push("The AI returned no website changes.")

  changeSet.operations.forEach((operation, index) => {
    const prefix = `Op #${index + 1} (${operation.type})`
    const payload = operation.payload
    if (operation.type === "UPDATE_BUSINESS") {
      for (const key of Object.keys(payload)) {
        if (!BUSINESS_KEYS.has(key) || typeof payload[key] !== "string") errors.push(`${prefix}: unsupported business field.`)
      }
    } else if (operation.type === "UPDATE_THEME") {
      for (const [key, value] of Object.entries(payload)) {
        if (!THEME_KEYS.has(key) || (typeof value !== "string" && key !== "style")) errors.push(`${prefix}: unsupported theme field.`)
        if (COLOR_KEYS.has(key) && typeof value === "string" && !/^#[0-9a-f]{3,8}$/i.test(value)) errors.push(`${prefix}: theme colors must be hex values.`)
        if (key === "style" && !["MODERN", "CLASSIC", "BOLD"].includes(String(value))) errors.push(`${prefix}: unsupported theme style.`)
      }
    } else if (operation.type === "UPDATE_NAVIGATION") {
      if (!Array.isArray(payload.items) || !payload.items.every((item: unknown) => typeof item === "string")) errors.push(`${prefix}: navigation must be an array of strings.`)
    } else if (operation.type === "UPDATE_CONTENT" && operation.targetId) {
      const section = currentSpec.sections.find((candidate) => candidate.id === operation.targetId)
      const allowed = section ? CONTENT_KEYS[section.type] || ["title", "body", "items"] : []
      for (const [key, value] of Object.entries(payload)) {
        if (!allowed.includes(key)) errors.push(`${prefix}: field is not editable for this section.`)
        if (key === "items" || key === "steps") {
          if (!isValidContentArray(section?.type || "generic", value)) errors.push(`${prefix}: ${key} contains invalid section content.`)
        } else if (key === "ctaColor") {
          if (typeof value !== "string" || !/^#[0-9a-f]{3,8}$/i.test(value)) errors.push(`${prefix}: ctaColor must be a hex color.`)
        } else if (key === "fontSize") {
          if (!["small", "medium", "large", "x-large"].includes(String(value))) errors.push(`${prefix}: fontSize must be small, medium, large, or x-large.`)
        } else if (typeof value !== "string") {
          errors.push(`${prefix}: ${key} must be text.`)
        }
      }
    } else if (operation.type === "TOGGLE_SECTION" && payload.visible !== undefined && typeof payload.visible !== "boolean") {
      errors.push(`${prefix}: visible must be boolean.`)
    } else if (operation.type === "REORDER_SECTIONS") {
      if (!Array.isArray(payload.order) || !payload.order.every((id: unknown) => typeof id === "string")) errors.push(`${prefix}: order must be section IDs.`)
    }
  })

  return { ...base, valid: errors.length === 0, errors }
}

export async function POST(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const access = await requireProjectAccess(params.projectId, "project:edit")
    const parsed = EditorAssistantSchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "Invalid editor assistant request" }, { status: 400 })

    const specResult = WebsiteSpecSchema.safeParse(parsed.data.spec)
    if (!specResult.success) return NextResponse.json({ error: "Invalid current website specification" }, { status: 400 })

    const currentSpec = specResult.data as WebsiteSpecData
    const projectConfig = getProjectLanguageConfig(access.project)
    if (!projectConfig.supportedLanguages.includes(parsed.data.selectedLanguage)) {
      return NextResponse.json({ error: "The selected website language is not enabled for this project" }, { status: 409 })
    }
    if (getWebsiteLocaleStatus(currentSpec, parsed.data.selectedLanguage) !== "ready") {
      return NextResponse.json({ error: "The selected website language is not ready for editing" }, { status: 409 })
    }

    const config = getProjectLanguageConfig(currentSpec)
    const activeSpec = resolveWebsiteLocale(currentSpec, parsed.data.selectedLanguage, config.primaryLanguage)
    const assistantLanguage = getAssistantLanguage(parsed.data.prompt, parsed.data.selectedLanguage)
    const projectName = access.project.name || parsed.data.projectName || "Website"
    const result = await runAIDesignAssistant({
      prompt: parsed.data.prompt,
      currentSpec: activeSpec,
      selectedLanguage: parsed.data.selectedLanguage,
      assistantLanguage,
      projectName,
      currentSection: parsed.data.currentSection,
      userId: access.user.id,
      organizationId: access.project.workspace.organizationId,
    })

    if (!result.ok) {
      console.error("Visual editor AI assistant failed", { projectId: params.projectId, error: result.error })
      const invalidResponse = ["PARSE_FAILED", "VALIDATION_FAILED", "OPENROUTER_INVALID_RESPONSE", "GROQ_INVALID_RESPONSE"].includes(result.error.code)
      return NextResponse.json({
        error: invalidResponse ? assistantClarification(assistantLanguage) : result.error.message,
      }, { status: invalidResponse ? 422 : result.error.code === "RATE_LIMITED" ? 429 : 503 })
    }

    const validation = validateAssistantChangeSet(result.data.data, activeSpec)
    if (!validation.valid) {
      console.error("Visual editor AI assistant returned an invalid changeset", { projectId: params.projectId, details: validation.errors })
      return NextResponse.json({ error: assistantClarification(assistantLanguage), details: validation.errors }, { status: 422 })
    }

    return NextResponse.json({ ok: true, changeSet: result.data.data, assistantLanguage, message: result.data.data.message || assistantConfirmation(assistantLanguage) })
  } catch (error) {
    if (error instanceof Error && (error.name === "AccessError" || error.name === "AuthError")) {
      return NextResponse.json({ error: error.message }, { status: error.name === "AuthError" ? 401 : 403 })
    }
    console.error("Visual editor assistant request failed", error)
    return NextResponse.json({ error: "Unable to process the design instruction" }, { status: 500 })
  }
}
