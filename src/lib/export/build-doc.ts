import type { DocModel, DocBlock } from "./model"

/** Converts any deliverable content JSON into a neutral DocModel */
export function buildDocModel(opts: {
  title: string
  subtitle?: string
  language: string
  content: unknown
  disclaimer?: string
}): DocModel {
  const blocks: DocBlock[] = []
  jsonToBlocks(opts.content, blocks)

  return {
    title: opts.title,
    subtitle: opts.subtitle,
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    language: opts.language,
    disclaimer: opts.disclaimer ?? "AI-generated content. Please review and validate before use.",
    blocks
  }
}

function jsonToBlocks(data: unknown, blocks: DocBlock[], depth = 0): void {
  if (data === null || data === undefined) return

  if (typeof data === "string") {
    blocks.push({ type: "paragraph", text: data })
    return
  }

  if (typeof data === "number" || typeof data === "boolean") {
    blocks.push({ type: "paragraph", text: String(data) })
    return
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return
    // Array of objects → table
    if (typeof data[0] === "object" && data[0] !== null && !Array.isArray(data[0])) {
      const headers = Object.keys(data[0] as Record<string, unknown>)
      const rows = data.map(item =>
        headers.map(h => String((item as Record<string, unknown>)[h] ?? ""))
      )
      blocks.push({ type: "table", headers: headers.map(humanize), rows })
    } else {
      // Array of primitives → list
      blocks.push({ type: "list", items: data.map(String) })
    }
    return
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue
      const label = humanize(key)

      if (typeof value === "string" && value.length < 200) {
        blocks.push({ type: "paragraph", text: `${label}: ${value}` })
      } else if (typeof value === "string") {
        blocks.push({ type: depth === 0 ? "heading" : "paragraph", level: 3, text: label } as DocBlock)
        blocks.push({ type: "paragraph", text: value })
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          blocks.push({ type: "heading", level: depth === 0 ? 2 : 3, text: label })
          jsonToBlocks(value, blocks, depth + 1)
        }
      } else if (typeof value === "object") {
        blocks.push({ type: "heading", level: depth === 0 ? 2 : 3, text: label })
        jsonToBlocks(value, blocks, depth + 1)
      } else {
        blocks.push({ type: "paragraph", text: `${label}: ${String(value)}` })
      }
    }
  }
}

function humanize(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}
