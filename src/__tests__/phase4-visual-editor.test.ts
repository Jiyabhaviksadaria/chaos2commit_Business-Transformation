/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest"
import { ConfigStore } from "@/lib/config-engine/config-store"
import { buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

describe("Phase 4: Schema-Driven Visual Editor Logic", () => {
  it("should support real-time property mutations and history state tracking", () => {
    const spec = buildWebsiteSpecFromTemplate("clinic")
    const store = new ConfigStore("p1", "clinic", spec)

    // Update section title visually
    store.updateSectionContent("hero", { headline: "World Class Dental Care" })
    const updatedSpec = store.getWebsiteSpec()

    const hero = updatedSpec.sections.find(s => s.id === "hero")
    expect((hero as any)?.headline).toBe("World Class Dental Care")
  })
})
