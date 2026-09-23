/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { specStore } from "@/lib/website/spec-store"

function generateSiteHTML(spec: any, siteName: string): string {
  const theme = spec?.theme || {}
  const primary = theme.primaryColor || theme.primary || "#6366f1"
  const secondary = theme.secondaryColor || "#8B5CF6"
  const bg = theme.backgroundColor || "#FFFFFF"
  const text = theme.textColor || "#111827"
  const navItems: string[] = spec?.nav || ["Home", "About", "Services", "Contact"]
  const sections: any[] = (spec?.sections || []).filter((s: any) => s.visible !== false)
  const seo = spec?.seo || {}

  const renderSection = (sec: any): string => {
    switch (sec.type) {
      case "hero":
        return `<section id="home" style="padding:80px 24px;text-align:center;background:linear-gradient(135deg,${primary}18,${secondary}12);border-bottom:1px solid #e5e7eb;">
          <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:900;margin:0 0 20px;color:${text};line-height:1.15;max-width:900px;margin-left:auto;margin-right:auto;">${sec.headline || ""}</h1>
          <p style="font-size:1.2rem;color:${text}99;margin:0 auto 32px;max-width:600px;line-height:1.6;">${sec.subheadline || ""}</p>
          ${sec.ctaLabel ? `<a href="#contact" style="display:inline-block;padding:14px 36px;background:${primary};color:#fff;border-radius:50px;font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 4px 15px ${primary}40;">${sec.ctaLabel}</a>` : ""}
        </section>`

      case "about":
        return `<section id="about" style="padding:64px 24px;max-width:820px;margin:0 auto;border-bottom:1px solid #f0f0f0;">
          <h2 style="font-size:2rem;font-weight:800;color:${primary};margin:0 0 18px;">${sec.title || "About Us"}</h2>
          <p style="font-size:1.05rem;line-height:1.8;color:${text}cc;">${sec.body || ""}</p>
        </section>`

      case "services":
        return `<section id="services" style="padding:64px 24px;background:#fafafa;border-bottom:1px solid #f0f0f0;">
          <div style="max-width:1100px;margin:0 auto;">
            <h2 style="font-size:2rem;font-weight:800;text-align:center;color:${primary};margin:0 0 40px;">${sec.title || "Our Services"}</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;">
              ${(sec.items || []).map((item: any, i: number) => `
              <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,0.07);border:1px solid #f0f0f0;">
                <div style="width:44px;height:44px;border-radius:12px;background:${primary};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;margin-bottom:16px;">${i + 1}</div>
                <h3 style="font-weight:700;font-size:1.05rem;margin:0 0 8px;color:${text};">${item.title || ""}</h3>
                <p style="font-size:0.9rem;color:${text}99;line-height:1.6;margin:0;">${item.description || ""}</p>
              </div>`).join("")}
            </div>
          </div>
        </section>`

      case "process":
        return `<section id="process" style="padding:64px 24px;max-width:1100px;margin:0 auto;border-bottom:1px solid #f0f0f0;">
          <h2 style="font-size:2rem;font-weight:800;text-align:center;color:${primary};margin:0 0 40px;">${sec.title || "How It Works"}</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;text-align:center;">
            ${(sec.steps || []).map((step: any, i: number) => `
            <div style="padding:20px;">
              <div style="width:52px;height:52px;border-radius:50%;background:${primary};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;margin:0 auto 16px;">${i + 1}</div>
              <h3 style="font-weight:700;margin:0 0 8px;color:${text};">${step.title || ""}</h3>
              <p style="font-size:0.9rem;color:${text}99;line-height:1.6;margin:0;">${step.description || ""}</p>
            </div>`).join("")}
          </div>
        </section>`

      case "testimonials":
        return `<section id="testimonials" style="padding:64px 24px;background:#fafafa;border-bottom:1px solid #f0f0f0;">
          <div style="max-width:1000px;margin:0 auto;">
            <h2 style="font-size:2rem;font-weight:800;text-align:center;color:${primary};margin:0 0 40px;">${sec.title || "What Our Clients Say"}</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;">
              ${(sec.items || []).map((item: any) => `
              <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                <p style="font-style:italic;color:${text}cc;margin:0 0 16px;line-height:1.7;">&ldquo;${item.quote || ""}&rdquo;</p>
                <p style="font-weight:700;color:${primary};margin:0;font-size:0.9rem;">— ${item.name || ""}</p>
              </div>`).join("")}
            </div>
          </div>
        </section>`

      case "faq":
        return `<section id="faq" style="padding:64px 24px;max-width:760px;margin:0 auto;border-bottom:1px solid #f0f0f0;">
          <h2 style="font-size:2rem;font-weight:800;text-align:center;color:${primary};margin:0 0 40px;">${sec.title || "FAQ"}</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${(sec.items || []).map((item: any) => `
            <div style="background:#fff;border:1px solid #f0f0f0;border-radius:14px;padding:22px;">
              <h3 style="font-weight:700;color:${primary};margin:0 0 10px;">${item.q || ""}</h3>
              <p style="color:${text}cc;margin:0;font-size:0.9rem;line-height:1.7;">${item.a || ""}</p>
            </div>`).join("")}
          </div>
        </section>`

      case "contact":
        return `<section id="contact" style="padding:64px 24px;background:${primary}08;">
          <div style="max-width:560px;margin:0 auto;text-align:center;">
            <h2 style="font-size:2rem;font-weight:800;color:${primary};margin:0 0 12px;">${sec.title || "Contact Us"}</h2>
            <p style="color:${text}99;margin:0 0 32px;">${sec.body || ""}</p>
            <form style="display:flex;flex-direction:column;gap:14px;text-align:left;" onsubmit="this.innerHTML='<p style=text-align:center;font-weight:700;color:${primary};padding:20px>Thank you! We will be in touch soon.</p>';return false;">
              <input placeholder="Your name" required style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;" />
              <input type="email" placeholder="Email address" required style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.95rem;width:100%;box-sizing:border-box;" />
              <textarea placeholder="Your message" rows="4" required style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;font-size:0.95rem;resize:none;width:100%;box-sizing:border-box;"></textarea>
              <button type="submit" style="padding:14px;background:${primary};color:#fff;border:none;border-radius:50px;font-weight:700;font-size:1rem;cursor:pointer;">Send Message</button>
            </form>
          </div>
        </section>`

      case "footer":
        return `<footer style="padding:28px 24px;text-align:center;background:#f9fafb;color:${text}88;font-size:0.875rem;border-top:1px solid #e5e7eb;">
          ${sec.text || `&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
        </footer>`

      default:
        return ""
    }
  }

  return `<!DOCTYPE html>
<html lang="${spec?.language || "en"}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${seo.title || siteName}</title>
  <meta name="description" content="${seo.description || ""}" />
  ${seo.ogTitle ? `<meta property="og:title" content="${seo.ogTitle}" />` : ""}
  ${seo.ogDescription ? `<meta property="og:description" content="${seo.ogDescription}" />` : ""}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${bg}; color: ${text}; }
    a { text-decoration: none; color: inherit; }
    a:hover { opacity: 0.8; }
    @media (max-width: 640px) {
      nav { flex-direction: column; gap: 12px; padding: 16px !important; }
      nav div { flex-wrap: wrap; gap: 12px !important; }
    }
  </style>
</head>
<body>
  <nav style="position:sticky;top:0;z-index:99;background:rgba(255,255,255,0.97);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <span style="font-weight:900;font-size:1.2rem;color:${primary};">${siteName}</span>
    <div style="display:flex;gap:24px;align-items:center;">
      ${navItems.map((item: string) => `<a href="#${item.toLowerCase().replace(/\s+/g, "-")}" style="color:#555;text-decoration:none;font-weight:600;font-size:0.9rem;">${item}</a>`).join("")}
    </div>
  </nav>
  ${sections.map(renderSection).join("\n")}
</body>
</html>`
}

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  try {
    // 1. Check in-memory store first (fastest, always works within the same server session)
    const memEntry = specStore.get(slug)
    if (memEntry) {
      const html = generateSiteHTML(memEntry.spec, memEntry.name)
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }

    // 2. Fall back to database lookup
    try {
      const project = await db.project.findFirst({
        where: { siteSlug: slug, sitePublished: true }
      })

      if (project) {
        // Extract websiteSpec from blueprintData JSON field
        const blueprint = project.blueprintData as any
        const spec = blueprint?.websiteSpec || null

        if (spec) {
          // Warm the in-memory cache for subsequent requests
          specStore.set(slug, { spec, name: project.name, savedAt: new Date() })
          const html = generateSiteHTML(spec, project.name)
          return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          })
        }
      }
    } catch (dbErr) {
      console.warn("DB lookup failed for slug:", slug, dbErr)
    }

    // 3. Not found in memory or DB — show friendly 404
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Site Not Found</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F7F4EB; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; background: white; border: 1px solid #E5DFD4; border-radius: 28px; padding: 48px 40px; max-width: 420px; width: 90%; }
    h2 { font-size: 1.5rem; font-weight: 900; color: #18181C; margin: 12px 0; }
    p { color: #888; font-size: 0.9rem; line-height: 1.6; margin: 0 0 24px; }
    code { background: #F7F4EB; padding: 3px 8px; border-radius: 6px; font-size: 0.85rem; color: #555; }
    a { display: inline-block; padding: 12px 28px; background: #18181C; color: #fff; border-radius: 50px; font-weight: 700; text-decoration: none; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:3rem;">🔍</div>
    <h2>Site Not Found</h2>
    <p>The link <code>${slug}</code> does not exist or hasn't been published yet.<br/>Go back to the editor and click <strong>Publish &amp; Get Link</strong> again.</p>
    <a href="/projects">Back to Workspace</a>
  </div>
</body>
</html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  } catch (err) {
    console.error("Site render error for slug:", slug, err)
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Error</title></head><body style="font-family:sans-serif;padding:40px;background:#F7F4EB;"><h2>Something went wrong</h2><p>${err instanceof Error ? err.message : "Unknown error"}</p><a href="/projects" style="color:#18181C;font-weight:700;">← Back to Workspace</a></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
}
