/** Neutral document model — all exporters render from this */
export type DocBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string; lang?: string }
  | { type: "pagebreak" }

export type DocModel = {
  title: string
  subtitle?: string
  date: string
  language: string
  disclaimer?: string
  blocks: DocBlock[]
}
