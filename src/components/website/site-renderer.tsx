"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { Monitor, Tablet, Smartphone, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebsiteLanguageSwitcher } from "@/components/website/website-language-switcher"
import { getSupportedWebsiteLocales, resolveWebsiteLocale } from "@/lib/website/localized-spec"

type DeviceMode = "desktop" | "tablet" | "mobile"

const deviceWidths: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px"
}

export function SiteRenderer({ spec, preview = false, initialLocale }: { spec: WebsiteSpecData; preview?: boolean; initialLocale?: string }) {
  const [device, setDevice] = useState<DeviceMode>("desktop")
  const supportedLocales = getSupportedWebsiteLocales(spec)
  const [siteLocale, setSiteLocale] = useState(initialLocale || spec.primaryLanguage || spec.language || "en")
  useEffect(() => {
    if (initialLocale) setSiteLocale(initialLocale)
  }, [initialLocale])
  const resolvedSpec = resolveWebsiteLocale(spec, siteLocale)

  return (
    <div className="w-full">
      {preview && (
        <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-muted/40 rounded-lg border">
          <div className="text-xs text-muted-foreground font-medium px-2">
            Responsive Preview ({device.toUpperCase()})
          </div>
          <div className="flex items-center gap-1">
            {(["desktop", "tablet", "mobile"] as DeviceMode[]).map(d => (
              <Button
                key={d}
                variant={device === d ? "default" : "ghost"}
                size="sm"
                onClick={() => setDevice(d)}
                className="gap-1.5 h-8 text-xs"
              >
                {d === "desktop" && <Monitor className="w-3.5 h-3.5" />}
                {d === "tablet" && <Tablet className="w-3.5 h-3.5" />}
                {d === "mobile" && <Smartphone className="w-3.5 h-3.5" />}
                <span className="capitalize hidden sm:inline">{d}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-center overflow-x-auto bg-muted/10 p-2 sm:p-4 rounded-xl border">
        <div
          className="shadow-xl rounded-lg overflow-hidden border bg-white"
          style={{
            width: preview ? deviceWidths[device] : "100%",
            transition: "width 0.3s ease",
            minWidth: "320px",
            maxWidth: "100%"
          }}
        >
          <SiteContent spec={resolvedSpec} supportedLocales={supportedLocales} currentLocale={siteLocale} onLocaleChange={setSiteLocale} preview={preview} />
        </div>
      </div>
    </div>
  )
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback
}

function SiteContent({
  spec,
  supportedLocales = [],
  currentLocale = "en",
  onLocaleChange,
  preview = false,
}: {
  spec: WebsiteSpecData
  supportedLocales?: string[]
  currentLocale?: string
  onLocaleChange?: (locale: any) => void
  preview?: boolean
}) {
  const theme = spec.theme || { primary: "#3B82F6", style: "MODERN" }
  const primary = safeColor(theme.primaryColor || theme.primary, "#3B82F6")
  const secondary = safeColor(theme.secondaryColor, "#8B5CF6")
  const bg = safeColor(theme.backgroundColor, "#FFFFFF")
  const text = safeColor(theme.textColor, "#111827")
  const stylePreset = theme.style || "MODERN"
  const isRTL = spec.dir === "rtl"

  // Filter visible sections & sort by order if provided
  const navAnchors = (spec.sections || [])
    .filter(section => section.visible !== false && section.type !== "footer")
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(section => section.id || section.type)
  const navTarget = (item: string, index: number) => {
    const normalized = item.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const aliases: Record<string, string> = { home: "home", about: "about", services: "services", contact: "contact" }
    return aliases[normalized] || navAnchors[index] || normalized || "home"
  }

  const visibleSections = (spec.sections || [])
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const containerClasses = stylePreset === "BOLD"
    ? "font-sans min-h-screen font-extrabold tracking-tight"
    : stylePreset === "CLASSIC"
    ? "font-serif min-h-screen"
    : "font-sans min-h-screen"

  return (
    <div lang={spec.language || "en"} dir={isRTL ? "rtl" : "ltr"} className={containerClasses} style={{ backgroundColor: bg, color: text, fontFamily: '"Noto Sans Devanagari", "Noto Sans Gujarati", var(--font-geist-sans), system-ui, sans-serif' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-4 flex items-center justify-between gap-4 shadow-sm">
        <span className="font-bold text-xl tracking-tight" style={{ color: primary }}>{spec.siteName}</span>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-6">
            {(spec.nav || ["Home", "About", "Services", "Contact"]).map((item, idx) => (
              <a key={idx} href={`#${navTarget(item, idx)}`} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                {item}
              </a>
            ))}
          </div>
          {!preview && onLocaleChange && supportedLocales.length > 0 && (
            <WebsiteLanguageSwitcher
              supportedLocales={supportedLocales}
              currentLocale={currentLocale}
              onLocaleChange={onLocaleChange}
              locales={supportedLocales}
            />
          )}
        </div>
      </nav>

      {/* Sections */}
      {visibleSections.map((sec, i) => {
        const section = sec as any
        const secId = section.id || `sec_${i}`
        switch (section.type) {
          case "hero": {
            const heroFontSize = section.fontSize === "small"
              ? "clamp(2rem, 4vw, 3rem)"
              : section.fontSize === "large"
              ? "clamp(3rem, 6vw, 4.5rem)"
              : section.fontSize === "x-large"
              ? "clamp(3.5rem, 7vw, 5.5rem)"
              : undefined
            const ctaColor = safeColor(section.ctaColor, primary)
            return (
              <section
                key={secId}
                id="home"
                className="py-20 px-6 text-center border-b"
                style={{
                  background: stylePreset === "BOLD"
                    ? `linear-gradient(135deg, ${primary}, ${secondary})`
                    : `linear-gradient(135deg, ${primary}15, ${secondary}10)`,
                  color: stylePreset === "BOLD" ? "#FFFFFF" : text
                }}
              >
                <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight max-w-4xl mx-auto" style={heroFontSize ? { fontSize: heroFontSize } : undefined}>
                  {section.headline}
                </h1>
                <p className="text-lg sm:text-xl mb-8 max-w-2xl mx-auto opacity-90">
                  {section.subheadline}
                </p>
                {section.ctaLabel && (
                  <button
                    className="px-8 py-3.5 rounded-full font-semibold text-lg shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5"
                    style={{
                      backgroundColor: ctaColor,
                      color: stylePreset === "BOLD" && ctaColor === primary ? "#FFFFFF" : stylePreset === "BOLD" ? primary : "#FFFFFF"
                    }}
                  >
                    {section.ctaLabel}
                  </button>
                )}
              </section>
            )
          }

          case "about":
            return (
              <section key={secId} id="about" className="py-16 px-6 max-w-4xl mx-auto border-b">
                <h2 className="text-3xl font-bold mb-6" style={{ color: primary }}>{section.title || "About Us"}</h2>
                <p className="leading-relaxed text-lg opacity-85">{section.body}</p>
              </section>
            )

          case "services":
            return (
              <section key={secId} id="services" className="py-16 px-6 bg-muted/20 border-b">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title || "Our Services"}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(section.items || []).map((item: any, j: number) => (
                      <div key={j} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg mb-4 flex items-center justify-center font-bold text-white" style={{ backgroundColor: primary }}>
                          {j + 1}
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                        <p className="text-gray-600 text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )

          case "process":
            return (
              <section key={secId} id="process" className="py-16 px-6 max-w-5xl mx-auto border-b">
                <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title || "How It Works"}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(section.steps || []).map((step: any, j: number) => (
                    <div key={j} className="text-center p-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4" style={{ backgroundColor: primary }}>
                        {j + 1}
                      </div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-gray-500 text-sm">{step.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )

          case "testimonials":
            return (
              <section key={secId} id="testimonials" className="py-16 px-6 bg-muted/30 border-b">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title || "What Clients Say"}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {(section.items || []).map((item: any, j: number) => (
                      <div key={j} className="bg-white p-6 rounded-xl shadow-sm border">
                        <p className="text-gray-700 italic mb-4">&ldquo;{item.quote}&rdquo;</p>
                        <p className="font-semibold text-sm" style={{ color: primary }}>{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )

          case "faq":
            return (
              <section key={secId} id="faq" className="py-16 px-6 max-w-3xl mx-auto border-b">
                <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title || "Frequently Asked Questions"}</h2>
                <div className="space-y-4">
                  {(section.items || []).map((item: any, j: number) => (
                    <div key={j} className="bg-white border rounded-xl p-5 shadow-sm">
                      <h3 className="font-semibold text-base mb-2" style={{ color: primary }}>{item.q}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            )

          case "contact":
            return (
              <ContactSection key={secId} title={section.title || "Contact Us"} body={section.body || "Get in touch with our team."} primary={primary} ui={spec.ui} />
            )

          case "footer":
            return (
              <footer key={secId} className="py-8 px-6 text-center text-sm text-gray-500 border-t bg-gray-50">
                {section.text || `© 2026 ${spec.siteName}. All rights reserved.`}
              </footer>
            )

          default:
            // Safe fallback for unknown section types (prevents website crashing)
            return (
              <section key={secId} className="py-8 px-6 bg-muted/10 border-b text-center">
                <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>Section ({section.type})</span>
                </div>
              </section>
            )
        }
      })}
    </div>
  )
}

function ContactSection({ title, body, primary, ui }: { title: string; body: string; primary: string; ui?: { namePlaceholder?: string; emailPlaceholder?: string; messagePlaceholder?: string; submitLabel?: string; successMessage?: string; requiredMessage?: string } }) {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [honeypot, setHoneypot] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id="contact" className="py-16 px-6 text-center border-b" style={{ backgroundColor: primary + "10" }}>
        <h2 className="text-3xl font-bold mb-4" style={{ color: primary }}>{title}</h2>
        <p className="text-green-600 font-semibold text-lg">{ui?.successMessage || "Thank you! We'll be in touch soon."}</p>
      </section>
    )
  }

  return (
    <section id="contact" className="py-16 px-6 border-b" style={{ backgroundColor: primary + "08" }}>
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center" style={{ color: primary }}>{title}</h2>
        <p className="text-gray-600 text-center mb-8">{body}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} aria-hidden="true" className="hidden" />
          <input value={name} onChange={e => setName(e.target.value)} required placeholder={ui?.namePlaceholder || "Your name"} className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder={ui?.emailPlaceholder || "Email address"} className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder={ui?.messagePlaceholder || "Your message"} rows={4} className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none bg-white" />
          <button type="submit" className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: primary }}>
            {ui?.submitLabel || "Send Message"}
          </button>
        </form>
      </div>
    </section>
  )
}
