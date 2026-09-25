import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { AssistantMarkdown, safeMarkdownUrl } from "@/components/ai/assistant-markdown"
import { ChatMessageList } from "@/components/ai/chat-message-list"

afterEach(() => {
  cleanup()
})

describe("assistant Markdown rendering", () => {
  it("renders headings, emphasis, GFM tables, lists, and code without raw Markdown", () => {
    render(
      <AssistantMarkdown
        content={`## Business & Technical Goals

**Important** and _clear_.

| Goal | Success metric |
| --- | --- |
| Synchronize inventory | Fewer oversells |

- Map the current flow
- Define the source of truth

1. Confirm the owner
2. Test the integration

\`inline code\`

\`\`\`ts
const sourceOfTruth = "inventory"
\`\`\`

> Assumptions are labeled.

---
`}
      />,
    )

    expect(screen.getByRole("heading", { name: "Business & Technical Goals" })).toBeInTheDocument()
    expect(screen.getByText("Important").tagName).toBe("STRONG")
    expect(screen.getByText("clear").tagName).toBe("EM")
    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Goal" })).toBeInTheDocument()
    expect(screen.getByText("Map the current flow").tagName).toBe("LI")
    expect(screen.getByText("Confirm the owner").tagName).toBe("LI")
    expect(screen.getByText("inline code").tagName).toBe("CODE")
    expect(screen.getByText('const sourceOfTruth = "inventory"').closest("pre")).toBeInTheDocument()
    expect(screen.getByText("Assumptions are labeled.").closest("blockquote")).toBeInTheDocument()
    expect(screen.getByRole("separator")).toBeInTheDocument()
  })

  it("keeps user messages as plain text", () => {
    render(
      <ChatMessageList
        messages={[{
          id: "user-1",
          role: "user",
          content: "**This should stay literal**",
          createdAt: "2026-01-01T00:00:00.000Z",
        }]}
        loading={false}
        sending={false}
        error={null}
        onRetry={() => undefined}
      />,
    )

    expect(screen.getByText("**This should stay literal**")).toBeInTheDocument()
    expect(screen.queryByText("This should stay literal")).not.toBeInTheDocument()
    expect(document.querySelector("strong")).not.toBeInTheDocument()
  })

  it("keeps unsafe link protocols out of the rendered anchor", () => {
    render(<AssistantMarkdown content={"[safe](https://example.com) [unsafe](javascript:alert(1))"} />)

    expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute("href", "https://example.com")
    expect(screen.queryByRole("link", { name: "unsafe" })).not.toBeInTheDocument()
    expect(safeMarkdownUrl("javascript:alert(1)")).toBe("")
    expect(safeMarkdownUrl("data:text/html,bad")).toBe("")
  })
})
