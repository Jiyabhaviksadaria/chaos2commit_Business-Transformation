import { describe, it, expect } from "vitest"
import { ConfigStore } from "@/lib/config-engine/config-store"
import { ChangeSetValidator, ChangeSet } from "@/lib/changeset/changeset-validator"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 2: Configuration Engine & ChangeSet Validator", () => {
  it("should update business info, theme, and navigation deterministically using ConfigStore", () => {
    const store = new ConfigStore("p1", "clinic")
    
    // Update business info
    const spec1 = store.updateBusiness({ name: "Bright Smile Dental", phone: "+1 555-999-0000" })
    expect(spec1.siteName).toBe("Bright Smile Dental")
    expect(store.getState().business.phone).toBe("+1 555-999-0000")

    // Update theme
    const spec2 = store.updateTheme({ primary: "#10B981", style: "BOLD" })
    expect(spec2.theme.primary).toBe("#10B981")
    expect(spec2.theme.style).toBe("BOLD")

    // Toggle section
    const spec3 = store.toggleSection("faq", false)
    const faq = spec3.sections.find(s => s.id === "faq")
    expect(faq?.visible).toBe(false)
  })

  it("should validate valid and invalid ChangeSets using ChangeSetValidator", () => {
    const currentSpec = buildWebsiteSpecFromTemplate("hr_consultancy")

    const validChangeSet: ChangeSet = {
      id: "cs-1",
      description: "Update theme to primary navy and toggle contact",
      aiGenerated: false,
      operations: [
        {
          type: "UPDATE_THEME",
          payload: { primary: "#1E3A8A" }
        },
        {
          type: "TOGGLE_SECTION",
          targetId: "about",
          payload: { visible: false }
        }
      ]
    }

    const res1 = ChangeSetValidator.validate(validChangeSet, currentSpec)
    expect(res1.valid).toBe(true)
    expect(res1.errors.length).toBe(0)
    expect(res1.affectedPaths).toContain("theme")
    expect(res1.affectedPaths).toContain("sections.about")

    const invalidChangeSet: ChangeSet = {
      id: "cs-2",
      description: "Invalid color and non-existent section",
      aiGenerated: true,
      operations: [
        {
          type: "UPDATE_THEME",
          payload: { primary: "INVALID_COLOR" }
        },
        {
          type: "TOGGLE_SECTION",
          targetId: "non_existent_section_id",
          payload: { visible: false }
        }
      ]
    }

    const res2 = ChangeSetValidator.validate(invalidChangeSet, currentSpec)
    expect(res2.valid).toBe(false)
    expect(res2.errors.length).toBe(2)
  })
})
