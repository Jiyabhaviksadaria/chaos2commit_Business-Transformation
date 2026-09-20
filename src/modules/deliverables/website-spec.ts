import { z } from "zod"
import { registerDeliverable } from "../registry"
import { DeliverableType } from "@prisma/client"

const HeroSection = z.object({ type: z.literal("hero"), headline: z.string(), subheadline: z.string(), ctaLabel: z.string() })
const AboutSection = z.object({ type: z.literal("about"), title: z.string(), body: z.string() })
const ServicesSection = z.object({ type: z.literal("services"), title: z.string(), items: z.array(z.object({ title: z.string(), description: z.string() })) })
const ProcessSection = z.object({ type: z.literal("process"), title: z.string(), steps: z.array(z.object({ title: z.string(), description: z.string() })) })
const TestimonialsSection = z.object({ type: z.literal("testimonials"), title: z.string(), items: z.array(z.object({ name: z.string(), quote: z.string() })) })
const FaqSection = z.object({ type: z.literal("faq"), title: z.string(), items: z.array(z.object({ q: z.string(), a: z.string() })) })
const ContactSection = z.object({ type: z.literal("contact"), title: z.string(), body: z.string() })
const FooterSection = z.object({ type: z.literal("footer"), text: z.string() })

export const WebsiteSpecSchema = z.object({
  siteName: z.string(),
  language: z.string(),
  theme: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    style: z.enum(["MODERN", "CLASSIC", "BOLD"])
  }),
  nav: z.array(z.string()),
  sections: z.array(z.union([
    HeroSection, AboutSection, ServicesSection, ProcessSection,
    TestimonialsSection, FaqSection, ContactSection, FooterSection
  ])),
  seo: z.object({ title: z.string(), description: z.string() })
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
    mockFixture: { siteName: "My Business", language: "en", theme: { primary: "#6366f1", style: "MODERN" }, nav: ["Home", "About", "Contact"], sections: [{ type: "hero", headline: "Welcome", subheadline: "We deliver results", ctaLabel: "Get Started" }], seo: { title: "My Business", description: "Business website" } }
  })
}
