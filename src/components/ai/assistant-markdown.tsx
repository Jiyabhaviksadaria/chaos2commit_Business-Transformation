"use client"

import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Keep Markdown links useful without allowing executable URL schemes. The
 * renderer also uses react-markdown's AST renderer, so raw HTML is never
 * injected into the page.
 */
export function safeMarkdownUrl(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ""

  let decoded = normalized
  try {
    decoded = decodeURIComponent(normalized)
  } catch {
    // Leave malformed percent escapes for the protocol check below.
  }

  if (/^(?:javascript|data|vbscript|file):/i.test(decoded)) return ""
  if (
    normalized.startsWith("#") ||
    normalized.startsWith("/") ||
    normalized.startsWith("./") ||
    normalized.startsWith("../")
  ) {
    return normalized
  }

  if (!/^[a-z][a-z\d+.-]*:/i.test(normalized)) return normalized

  try {
    const protocol = new URL(normalized).protocol.toLowerCase()
    if (["http:", "https:", "mailto:", "tel:"].includes(protocol)) return normalized
  } catch {
    return ""
  }

  return ""
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

const markdownComponents: Components = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-2 mt-4 text-base font-extrabold leading-6 text-neutral-900 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-4 text-sm font-extrabold leading-5 text-neutral-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-3 text-xs font-extrabold leading-5 text-neutral-900 first:mt-0">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="mb-1.5 mt-3 text-xs font-bold leading-5 text-neutral-900 first:mt-0">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-extrabold text-neutral-900">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="pl-0.5 leading-5 marker:text-neutral-400">{children}</li>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-[#F8B4D9] bg-[#FFF8FB] py-1 pl-3 pr-2 text-neutral-600">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-0 border-t border-[#E5DFD4]" />,
  a: ({ children, href, title }: { children?: React.ReactNode; href?: string; title?: string }) => {
    const safeHref = safeMarkdownUrl(href ?? "")
    if (!safeHref) return <span className="text-neutral-700 underline decoration-neutral-300 underline-offset-2">{children}</span>

    const external = isExternalUrl(safeHref) || safeHref.startsWith("//")
    return (
      <a
        href={safeHref}
        title={title}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="font-medium text-[#c24182] underline decoration-[#F8B4D9] underline-offset-2 transition hover:text-[#9d174d]"
      >
        {children}
      </a>
    )
  },
  img: ({ alt, src, title }: { alt?: string; src?: string; title?: string }) => {
    const safeSrc = safeMarkdownUrl(src ?? "")
    if (!safeSrc) return <span>{alt ?? ""}</span>
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={safeSrc} alt={alt ?? ""} title={title} className="my-2 max-h-64 max-w-full rounded-xl object-contain" />
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-[#E5DFD4] bg-white custom-chat-scrollbar">
      <table className="min-w-full border-collapse text-left text-[11px] leading-5">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-[#FAF8F2] text-neutral-700">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody className="divide-y divide-[#EEE9E0]">{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => <tr className="even:bg-[#FFFCF8]">{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="whitespace-nowrap px-3 py-2 font-extrabold">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 align-top text-neutral-700">{children}</td>,
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-neutral-950 p-3 text-[11px] leading-5 text-neutral-100 shadow-inner custom-chat-scrollbar [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-neutral-100">
      {children}
    </pre>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <code className={`rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] text-neutral-800 ${className ?? ""}`}>
      {children}
    </code>
  ),
  input: ({ type, checked, disabled, readOnly }: { type?: string; checked?: boolean; disabled?: boolean; readOnly?: boolean }) => (
    <input
      type={type}
      checked={checked}
      disabled={disabled}
      readOnly={readOnly}
      className="mr-1 h-3 w-3 accent-[#F472B6]"
    />
  ),
}

type AssistantMarkdownProps = {
  content: string
  className?: string
  /** Keep a partial stream's exact trailing whitespace visible to the DOM. */
  preserveTrailingWhitespace?: boolean
}

export function AssistantMarkdown({
  content,
  className = "",
  preserveTrailingWhitespace = false,
}: AssistantMarkdownProps) {
  const trailingWhitespace = preserveTrailingWhitespace ? content.match(/\s+$/)?.[0] ?? "" : ""

  return (
    <div className={`min-w-0 break-words ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
      {trailingWhitespace ? <span aria-hidden="true">{trailingWhitespace}</span> : null}
    </div>
  )
}
