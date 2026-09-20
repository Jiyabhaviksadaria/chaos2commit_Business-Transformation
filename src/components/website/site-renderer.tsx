"use client"

import React, { useState } from "react"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { Monitor, Tablet, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

type DeviceMode = "desktop" | "tablet" | "mobile"

const deviceWidths: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px"
}

export function SiteRenderer({ spec, preview = false }: { spec: WebsiteSpecData; preview?: boolean }) {
  const [device, setDevice] = useState<DeviceMode>("desktop")

  return (
    <div className="w-full">
      {preview && (
        <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-muted/40 rounded-lg">
          {(["desktop", "tablet", "mobile"] as DeviceMode[]).map(d => (
            <Button
              key={d}
              variant={device === d ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice(d)}
              className="gap-2"
            >
              {d === "desktop" && <Monitor className="w-4 h-4" />}
              {d === "tablet" && <Tablet className="w-4 h-4" />}
              {d === "mobile" && <Smartphone className="w-4 h-4" />}
              <span className="capitalize hidden sm:inline">{d}</span>
            </Button>
          ))}
        </div>
      )}
      <div className="flex justify-center overflow-x-auto">
        <div style={{ width: preview ? deviceWidths[device] : "100%", transition: "width 0.3s ease", minWidth: "320px" }}>
          <SiteContent spec={spec} />
        </div>
      </div>
    </div>
  )
}

function SiteContent({ spec }: { spec: WebsiteSpecData }) {
  const primary = spec.theme.primary
  const isRTL = spec.language === "ar"

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="font-sans bg-white text-gray-900 min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <span className="font-bold text-lg" style={{ color: primary }}>{spec.siteName}</span>
        <div className="hidden sm:flex gap-6">
          {spec.nav.map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
              {item}
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      {spec.sections.map((section, i) => {
        switch (section.type) {
          case "hero":
            return (
              <section key={i} id="home" className="py-20 px-6 text-center" style={{ background: `linear-gradient(135deg, ${primary}15, ${primary}08)` }}>
                <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">{section.headline}</h1>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">{section.subheadline}</p>
                <button
                  className="px-8 py-3 rounded-full text-white font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primary }}
                >
                  {section.ctaLabel}
                </button>
              </section>
            )
          case "about":
            return (
              <section key={i} id="about" className="py-16 px-6 max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-6" style={{ color: primary }}>{section.title}</h2>
                <p className="text-gray-600 leading-relaxed text-lg">{section.body}</p>
              </section>
            )
          case "services":
            return (
              <section key={i} id="services" className="py-16 px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.items.map((item, j) => (
                      <div key={j} className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-lg mb-4" style={{ backgroundColor: primary + "20" }} />
                        <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                        <p className="text-gray-500 text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          case "process":
            return (
              <section key={i} id="process" className="py-16 px-6 max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {section.steps.map((step, j) => (
                    <div key={j} className="text-center">
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
              <section key={i} id="testimonials" className="py-16 px-6 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {section.items.map((item, j) => (
                      <div key={j} className="bg-white p-6 rounded-xl shadow-sm border">
                        <p className="text-gray-600 italic mb-4">&ldquo;{item.quote}&rdquo;</p>
                        <p className="font-semibold text-sm" style={{ color: primary }}>{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          case "faq":
            return (
              <section key={i} id="faq" className="py-16 px-6 max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: primary }}>{section.title}</h2>
                <div className="space-y-4">
                  {section.items.map((item, j) => (
                    <div key={j} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">{item.q}</h3>
                      <p className="text-gray-600 text-sm">{item.a}</p>
                    </div>
                  ))}
                </div>
              </section>
            )
          case "contact":
            return (
              <ContactSection key={i} title={section.title} body={section.body} primary={primary} projectId="" />
            )
          case "footer":
            return (
              <footer key={i} className="py-8 px-6 text-center text-sm text-gray-400 border-t">
                {section.text}
              </footer>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function ContactSection({ title, body, primary }: { title: string; body: string; primary: string; projectId: string }) {
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [honeypot, setHoneypot] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return // bot trap
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id="contact" className="py-16 px-6 text-center" style={{ backgroundColor: primary + "10" }}>
        <h2 className="text-3xl font-bold mb-4" style={{ color: primary }}>{title}</h2>
        <p className="text-green-600 font-semibold text-lg">Thank you! We&apos;ll be in touch soon.</p>
      </section>
    )
  }

  return (
    <section id="contact" className="py-16 px-6" style={{ backgroundColor: primary + "08" }}>
      <div className="max-w-xl mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center" style={{ color: primary }}>{title}</h2>
        <p className="text-gray-600 text-center mb-8">{body}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field — hidden from users */}
          <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} aria-hidden="true" className="hidden" />
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': primary } as React.CSSProperties} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email address" className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2" />
          <textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Your message" rows={4} className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none" />
          <button type="submit" className="w-full py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: primary }}>
            Send Message
          </button>
        </form>
      </div>
    </section>
  )
}
