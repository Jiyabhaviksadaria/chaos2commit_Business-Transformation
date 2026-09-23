import { z } from "zod"
import { registerDeliverable } from "../registry-store"
import { DeliverableType } from "@prisma/client"

const BaseSectionFields = {
  id: z.string().optional(),
  order: z.number().optional(),
  visible: z.boolean().optional()
}

const HeroSection = z.object({
  ...BaseSectionFields,
  type: z.literal("hero"),
  headline: z.string(),
  subheadline: z.string(),
  ctaLabel: z.string()
})

const AboutSection = z.object({
  ...BaseSectionFields,
  type: z.literal("about"),
  title: z.string(),
  body: z.string()
})

const ServicesSection = z.object({
  ...BaseSectionFields,
  type: z.literal("services"),
  title: z.string(),
  items: z.array(z.object({ title: z.string(), description: z.string() }))
})

const ProcessSection = z.object({
  ...BaseSectionFields,
  type: z.literal("process"),
  title: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string() }))
})

const TestimonialsSection = z.object({
  ...BaseSectionFields,
  type: z.literal("testimonials"),
  title: z.string(),
  items: z.array(z.object({ name: z.string(), quote: z.string() }))
})

const FaqSection = z.object({
  ...BaseSectionFields,
  type: z.literal("faq"),
  title: z.string(),
  items: z.array(z.object({ q: z.string(), a: z.string() }))
})

const ContactSection = z.object({
  ...BaseSectionFields,
  type: z.literal("contact"),
  title: z.string(),
  body: z.string()
})

const FooterSection = z.object({
  ...BaseSectionFields,
  type: z.literal("footer"),
  text: z.string()
})

const GenericSection = z.object({
  ...BaseSectionFields,
  type: z.string(),
  title: z.string().optional(),
  body: z.string().optional(),
  items: z.array(z.any()).optional()
})

export const SectionSchema = z.union([
  HeroSection, AboutSection, ServicesSection, ProcessSection,
  TestimonialsSection, FaqSection, ContactSection, FooterSection,
  GenericSection
])

export type SectionData = z.infer<typeof SectionSchema>

export const WebsiteThemeSchema = z.object({
  primary: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
  buttonStyle: z.string().optional(),
  style: z.enum(["MODERN", "CLASSIC", "BOLD"]).optional()
})

export type WebsiteThemeData = z.infer<typeof WebsiteThemeSchema>

export const WebsiteSpecSchema = z.object({
  siteName: z.string(),
  language: z.string().optional(),
  dir: z.enum(["ltr", "rtl"]).optional(),
  theme: WebsiteThemeSchema,
  nav: z.array(z.string()),
  sections: z.array(SectionSchema),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()).optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional()
  })
})

export type WebsiteSpecData = z.infer<typeof WebsiteSpecSchema>

export function initWebsiteSpecModule() {
  registerDeliverable<WebsiteSpecData>({
    type: DeliverableType.WEBSITE_SPEC,
    i18nTitleKey: "deliverables.website_spec.title",
    dependsOn: [DeliverableType.INTAKE_ANALYSIS],
    systemPrompt: `You are an expert web designer and copywriter. Generate a professional website spec as JSON.
Generate all text content in the specified output language.
Sections can be: hero, about, services, process, testimonials, faq, contact, footer.
Include a compelling hero with CTA, at least 3 services, and contact section.
Make content specific to the business — no generic placeholders.`,
    buildUserPrompt: (ctx: string, extra?: string) => {
      return `Design a complete website for this business:\n\n${ctx}\n\n${extra ? `Instructions: ${extra}` : ""}\n\nReturn the full JSON website spec.`
    },
    outputSchema: WebsiteSpecSchema,
    mockFixture: {
      siteName: "My Business",
      language: "en",
      theme: { primary: "#6366f1", style: "MODERN" },
      nav: ["Home", "About", "Services", "Contact"],
      sections: [
        { id: "hero", type: "hero", order: 1, visible: true, headline: "Welcome", subheadline: "We deliver results", ctaLabel: "Get Started" },
        { id: "about", type: "about", order: 2, visible: true, title: "About Us", body: "Leading software transformation provider." },
        { id: "services", type: "services", order: 3, visible: true, title: "Services", items: [{ title: "Consulting", description: "Expert advice" }] },
        { id: "contact", type: "contact", order: 4, visible: true, title: "Contact", body: "Reach out to us today." },
        { id: "footer", type: "footer", order: 5, visible: true, text: "© 2026 My Business. All rights reserved." }
      ],
      seo: { title: "My Business", description: "Business website" }
    }
  })
}
