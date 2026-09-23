import { describe, it, expect } from "vitest"
import { getAllTemplates, getTemplateById, buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 1: Starter Template Registry & Project Schema", () => {
  it("should register exactly 8 business starter templates", () => {
    const templates = getAllTemplates()
    expect(templates.length).toBe(8)

    const ids = templates.map(t => t.id)
    expect(ids).toContain("clinic")
    expect(ids).toContain("hr_consultancy")
    expect(ids).toContain("retail_store")
    expect(ids).toContain("school_coaching")
    expect(ids).toContain("logistics")
    expect(ids).toContain("restaurant")
    expect(ids).toContain("real_estate")
    expect(ids).toContain("startup")
  })

  it("should retrieve each template by ID and contain required fields", () => {
    const clinic = getTemplateById("clinic")
    expect(clinic).not.toBeNull()
    expect(clinic?.name).toBe("Medical & Dental Clinic")
    expect(clinic?.pages.length).toBeGreaterThan(3)
    expect(clinic?.configs.business.name).toBeDefined()
    expect(clinic?.configs.content.hero.headline).toBeDefined()
    expect(clinic?.configs.theme.primary).toBe("#0D9488")
    expect(clinic?.configs.navigation.items.length).toBeGreaterThan(0)
    expect(clinic?.configs.features.appointment_form).toBe(true)
  })

  it("should deterministically generate a valid WebsiteSpec baseline WITHOUT calling an LLM", () => {
    const spec = buildWebsiteSpecFromTemplate("restaurant", "La Bella Italia")

    expect(spec.siteName).toBe("La Bella Italia")
    expect(spec.theme.primary).toBe("#991B1B")
    expect(spec.theme.style).toBe("CLASSIC")
    expect(spec.sections.length).toBeGreaterThan(4)

    const hero = spec.sections.find(s => s.id === "hero")
    expect(hero).toBeDefined()
    expect((hero as any)?.headline).toContain("Italian")

    const contact = spec.sections.find(s => s.id === "contact")
    expect(contact).toBeDefined()
  })
})
