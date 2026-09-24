import * as cheerio from "cheerio"
import { assertPublicUrl, canonicalizeUrl, SsrfError } from "@/lib/ssrf"

export interface ExtractedWebsite {
  requestedUrl: string
  finalUrl: string
  title: string
  description: string
  text: string
  metadata: Record<string, unknown>
}

function cleanText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim()
}

/** Parse an HTML response into visible, business-oriented text. */
export function extractBusinessContent(html: string, requestedUrl: string, finalUrl = requestedUrl): ExtractedWebsite {
  const $ = cheerio.load(html)
  $("script, style, noscript, template, svg, canvas, iframe, form, button, nav, footer, aside, [role='navigation'], [aria-hidden='true']").remove()
  const title = cleanText($("title").first().text())
  const description = cleanText($("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "")
  const canonical = $("link[rel='canonical']").attr("href")
  const root = $("main, article, [role='main']").first()
  const contentRoot = root.length > 0 ? root : $("body")
  const blocks: string[] = []
  contentRoot.find("h1, h2, h3, h4, p, li, blockquote, td, th").each((_, element) => {
    const text = cleanText($(element).text())
    if (text.length >= 2) blocks.push(text)
  })
  if (blocks.length === 0) {
    const bodyText = cleanText(contentRoot.text())
    if (bodyText) blocks.push(bodyText)
  }
  const text = blocks.filter((block, index) => index === 0 || block !== blocks[index - 1]).join("\n").slice(0, 100_000).trim()
  if (!text) throw new Error("The website did not contain readable business content.")
  return { requestedUrl, finalUrl, title, description, text, metadata: { title, description, canonicalUrl: canonical || finalUrl, extractedAt: new Date().toISOString(), contentLength: text.length } }
}

export interface FetchedWebsite extends ExtractedWebsite { status: number; contentType: string; responseUrl: string }

async function readLimitedBody(response: Response, maxBytes: number, signal: AbortSignal): Promise<Buffer> {
  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > maxBytes) throw new Error("The website response is larger than the 2MB ingestion limit.")
    return buffer
  }
  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    while (true) {
      if (signal.aborted) throw new Error("The website took too long to respond. Try again or upload a document instead.")
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error("The website response is larger than the 2MB ingestion limit.")
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks)
}

/** Fetch with bounded redirects, bytes and total request time. */
export async function fetchAndExtractWebsite(rawUrl: string): Promise<FetchedWebsite> {
  let current = await assertPublicUrl(rawUrl)
  const requestedUrl = canonicalizeUrl(current)
  const maxRedirects = 4
  const maxBytes = 2 * 1024 * 1024
  const timeoutMs = 12_000
  const deadline = Date.now() + timeoutMs

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error("The website took too long to respond. Try again or upload a document instead.")
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), remaining)
    try {
      const response = await fetch(current, { method: "GET", redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.8", "User-Agent": "Business-Transformation-AI/1.0" } })
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (redirect === maxRedirects) throw new Error("The website redirected too many times.")
        current = await assertPublicUrl(new URL(response.headers.get("location")!, current))
        continue
      }
      if (!response.ok) throw new Error(`The website responded with status ${response.status}.`)
      const contentType = (response.headers.get("content-type") || "").toLowerCase()
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml") && !contentType.includes("text/plain")) throw new Error("The URL did not return an HTML web page.")
      const declaredLength = Number(response.headers.get("content-length") || 0)
      if (declaredLength > maxBytes) throw new Error("The website response is larger than the 2MB ingestion limit.")
      const buffer = await readLimitedBody(response, maxBytes, controller.signal)
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
      const extracted = extractBusinessContent(html, requestedUrl, canonicalizeUrl(current))
      return { ...extracted, status: response.status, contentType, responseUrl: current.toString() }
    } catch (error) {
      if (controller.signal.aborted) throw new Error("The website took too long to respond. Try again or upload a document instead.")
      if (error instanceof Error) throw error
      throw new Error("Unable to reach the website. Check the URL and try again.")
    } finally {
      clearTimeout(timer)
    }
  }
  throw new SsrfError("The website could not be safely fetched.", "FETCH_FAILED")
}
