import type { DocModel } from "./model"

/** Self-contained HTML export — inline CSS, no external deps */
export function toHtml(doc: DocModel): string {
  const bodyParts: string[] = []

  for (const block of doc.blocks) {
    switch (block.type) {
      case "heading":
        bodyParts.push(`<h${block.level}>${esc(block.text)}</h${block.level}>`)
        break
      case "paragraph":
        bodyParts.push(`<p>${esc(block.text)}</p>`)
        break
      case "list":
        bodyParts.push(`<ul>${block.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`)
        break
      case "code":
        bodyParts.push(`<pre><code>${esc(block.text)}</code></pre>`)
        break
      case "table": {
        const headers = block.headers.map(h => `<th>${esc(h)}</th>`).join("")
        const rows = block.rows.map(row =>
          `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`
        ).join("")
        bodyParts.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case "pagebreak":
        bodyParts.push(`<hr class="pagebreak" />`)
        break
    }
  }

  return `<!DOCTYPE html>
<html lang="${esc(doc.language)}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(doc.title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:2rem;color:#111;line-height:1.6}
  h1{font-size:2rem;font-weight:700;margin:2rem 0 1rem;color:#1a1a2e}
  h2{font-size:1.5rem;font-weight:600;margin:1.5rem 0 0.75rem;color:#2d2d44;border-bottom:2px solid #e5e7eb;padding-bottom:0.5rem}
  h3{font-size:1.1rem;font-weight:600;margin:1rem 0 0.5rem}
  p{margin-bottom:0.75rem}
  ul{margin:0.5rem 0 0.75rem 1.5rem}
  li{margin-bottom:0.25rem}
  pre{background:#f8f9fa;border:1px solid #e5e7eb;border-radius:4px;padding:1rem;overflow-x:auto;margin:0.75rem 0}
  code{font-family:monospace;font-size:0.875rem}
  table{width:100%;border-collapse:collapse;margin:1rem 0}
  th{background:#f3f4f6;font-weight:600;text-align:left;padding:0.5rem 0.75rem;border:1px solid #d1d5db}
  td{padding:0.5rem 0.75rem;border:1px solid #e5e7eb}
  tr:nth-child(even) td{background:#f9fafb}
  .pagebreak{border:none;border-top:2px dashed #e5e7eb;margin:2rem 0}
  .cover{text-align:center;padding:3rem 0;border-bottom:2px solid #e5e7eb;margin-bottom:2rem}
  .cover h1{font-size:2.5rem;color:#6366f1}
  .disclaimer{background:#fff7ed;border-left:4px solid #f59e0b;padding:0.75rem 1rem;font-style:italic;font-size:0.875rem;color:#92400e;margin:1rem 0}
</style>
</head>
<body>
<div class="cover">
  <h1>${esc(doc.title)}</h1>
  ${doc.subtitle ? `<p style="font-size:1.1rem;color:#666;margin:0.5rem 0">${esc(doc.subtitle)}</p>` : ""}
  <p style="color:#888;font-size:0.875rem;margin-top:0.5rem">Generated: ${esc(doc.date)}</p>
</div>
${doc.disclaimer ? `<div class="disclaimer">${esc(doc.disclaimer)}</div>` : ""}
${bodyParts.join("\n")}
</body>
</html>`
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
