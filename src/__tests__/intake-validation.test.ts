import { describe, expect, it } from "vitest"
import { extractBusinessContent } from "@/lib/intake/url"
import { parseDocument, validateDocumentBytes, validateDocumentFile } from "@/lib/intake/documents"
import { parseExternalUrl, SsrfError } from "@/lib/ssrf"

describe("intake source validation", () => {
  it("accepts public HTTP URLs and rejects unsafe URL targets", () => {
    expect(parseExternalUrl("example.com").toString()).toBe("https://example.com/")
    expect(() => parseExternalUrl("file:///etc/passwd")).toThrow(SsrfError)
    expect(() => parseExternalUrl("http://localhost:3000")).toThrow(SsrfError)
    expect(() => parseExternalUrl("http://127.0.0.1")).toThrow(SsrfError)
    expect(() => parseExternalUrl("https://user:pass@example.com")).toThrow(SsrfError)
    expect(() => parseExternalUrl("https://example.com:22")).toThrow(SsrfError)
  })

  it("extracts visible business content and removes navigation and scripts", () => {
    const extracted = extractBusinessContent(
      `<html><head><title>Acme Health</title><meta name="description" content="Acme provides care"></head><body><nav>Menu</nav><main><h1>Acme Health</h1><p>Book an appointment with our clinical team.</p></main><script>alert('x')</script></body></html>`,
      "https://acme.example",
    )
    expect(extracted.title).toBe("Acme Health")
    expect(extracted.text).toContain("Book an appointment")
    expect(extracted.text).not.toContain("Menu")
    expect(extracted.text).not.toContain("alert")
  })

  it("validates, fingerprints, and extracts supported text documents", async () => {
    const file = new File(["Acme business overview\nRevenue is growing."], "overview.txt", { type: "text/plain" })
    expect(validateDocumentFile(file).kind).toBe("txt")
    const validated = await validateDocumentBytes(file)
    expect(validated.checksum).toMatch(/^[a-f0-9]{64}$/)
    const parsed = await parseDocument(validated)
    expect(parsed.text).toContain("Acme business overview")
  })

  it("rejects empty, unsupported, and path-traversal uploads", () => {
    expect(() => validateDocumentFile(new File([], "empty.txt", { type: "text/plain" }))).toThrow(/empty/i)
    expect(() => validateDocumentFile(new File(["x"], "notes.exe", { type: "application/octet-stream" }))).toThrow(/unsupported/i)
    expect(() => validateDocumentFile(new File(["x"], "../notes.txt", { type: "text/plain" }))).toThrow(/path traversal/i)
    expect(() => validateDocumentFile(new File(["x"], "notes.txt", { type: "application/pdf" }))).toThrow(/MIME/i)
  })
})
