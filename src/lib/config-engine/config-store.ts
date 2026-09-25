/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { getTemplateById, buildWebsiteSpecFromTemplate } from "@/lib/templates/template-registry"

export interface ProjectConfigState {
  projectId: string
  templateId: string
  business: {
    name: string
    phone?: string
    email?: string
    address?: string
    operatingHours?: string
    tagline?: string
  }
  theme: {
    primary: string
    secondaryColor?: string
    backgroundColor: string
    textColor: string
    accentColor?: string
    style: "MODERN" | "CLASSIC" | "BOLD"
    font?: string
  }
  navigation: {
    logoText: string
    items: string[]
  }
  features: Record<string, boolean>
  spec: WebsiteSpecData
}

export class ConfigStore {
  private state: ProjectConfigState

  constructor(projectId: string, templateId: string, initialSpec?: WebsiteSpecData) {
    const tmpl = getTemplateById(templateId) || getTemplateById("clinic")!
    const spec = initialSpec || buildWebsiteSpecFromTemplate(templateId)

    this.state = {
      projectId,
      templateId,
      business: {
        name: spec.siteName,
        phone: tmpl.configs.business.phone,
        email: tmpl.configs.business.email,
        address: tmpl.configs.business.address,
        operatingHours: tmpl.configs.business.operatingHours,
        tagline: tmpl.configs.business.tagline
      },
      theme: {
        primary: spec.theme.primary || spec.theme.primaryColor || "#6366f1",
        secondaryColor: spec.theme.secondaryColor || "#4f46e5",
        backgroundColor: spec.theme.backgroundColor || "#0f172a",
        textColor: spec.theme.textColor || "#f8fafc",
        accentColor: spec.theme.accentColor || "#38bdf8",
        style: spec.theme.style || "MODERN",
        font: tmpl.configs.theme.font
      },
      navigation: {
        logoText: tmpl.configs.navigation.logoText || spec.siteName,
        items: [...spec.nav]
      },
      features: { ...tmpl.configs.features },
      spec
    }
  }

  public getState(): ProjectConfigState {
    return this.state
  }

  public getWebsiteSpec(): WebsiteSpecData {
    return this.state.spec
  }

  public replaceWebsiteSpec(spec: WebsiteSpecData): void {
    this.state.spec = syncPrimaryWebsiteContent(spec)
    this.state.business.name = this.state.spec.siteName
    this.state.navigation.logoText = this.state.spec.siteName
    this.state.navigation.items = [...this.state.spec.nav]
  }

  /**
   * Deterministically updates business properties (Name, Phone, Email, Address, etc.)
   */
  public updateBusiness(updates: Partial<ProjectConfigState["business"]>): WebsiteSpecData {
    this.state.business = { ...this.state.business, ...updates }
    if (updates.name) {
      this.state.spec.siteName = updates.name
      this.state.navigation.logoText = updates.name
      if (this.state.spec.seo) {
        this.state.spec.seo.title = updates.name
      }
    }

    // Update contact section if exists
    const contactSection = this.state.spec.sections.find(s => s.id === "contact")
    if (contactSection) {
      const b = this.state.business
      ;(contactSection as any).body = [b.address, b.phone, b.email].filter(Boolean).join(" | ")
    }

    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }

  /**
   * Deterministically updates theme colors, font, and style
   */
  public updateTheme(updates: Partial<ProjectConfigState["theme"]>): WebsiteSpecData {
    this.state.theme = { ...this.state.theme, ...updates }
    this.state.spec.theme = {
      ...this.state.spec.theme,
      primary: this.state.theme.primary,
      secondaryColor: this.state.theme.secondaryColor,
      backgroundColor: this.state.theme.backgroundColor,
      textColor: this.state.theme.textColor,
      accentColor: this.state.theme.accentColor,
      fontFamily: this.state.theme.font,
      style: this.state.theme.style
    }
    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }

  /**
   * Deterministically updates navigation items
   */
  public updateNavigation(items: string[]): WebsiteSpecData {
    this.state.navigation.items = items
    this.state.spec.nav = items
    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }

  /**
   * Toggle visibility of a section
   */
  public toggleSection(sectionId: string, visible?: boolean): WebsiteSpecData {
    const section = this.state.spec.sections.find(s => s.id === sectionId)
    if (section) {
      section.visible = visible !== undefined ? visible : !section.visible
    }
    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }

  /**
   * Reorder section positions
   */
  public reorderSections(sectionIds: string[]): WebsiteSpecData {
    const sectionMap = new Map(this.state.spec.sections.map(s => [s.id, s]))
    const newSections: any[] = []

    sectionIds.forEach((id, index) => {
      const s = sectionMap.get(id)
      if (s) {
        s.order = index + 1
        newSections.push(s)
        sectionMap.delete(id)
      }
    })

    // Append remaining
    sectionMap.forEach(s => newSections.push(s))
    this.state.spec.sections = newSections
    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }

  /**
   * Update content inside a specific section
   */
  public updateSectionContent(sectionId: string, updates: Record<string, any>): WebsiteSpecData {
    const idx = this.state.spec.sections.findIndex(s => s.id === sectionId)
    if (idx !== -1) {
      this.state.spec.sections[idx] = {
        ...this.state.spec.sections[idx],
        ...updates
      }
    }
    this.state.spec = syncPrimaryWebsiteContent(this.state.spec)
    return this.state.spec
  }
}
