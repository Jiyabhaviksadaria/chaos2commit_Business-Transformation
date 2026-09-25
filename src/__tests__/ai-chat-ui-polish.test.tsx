import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ChatComposer } from "@/components/ai/chat-composer"
import { ChatMessageList } from "@/components/ai/chat-message-list"
import type { ChatMessage } from "@/lib/api/ai-chats"

describe("AI Chat UI Polish & Interaction Tests", () => {
  afterEach(() => {
    cleanup()
  })

  describe("ChatComposer interactions", () => {
    it("sends message on Enter key without Shift", () => {
      const onSend = vi.fn()
      const onStop = vi.fn()
      const onChange = vi.fn()

      render(
        <ChatComposer
          value="Test message"
          onChange={onChange}
          onSend={onSend}
          onStop={onStop}
          disabled={false}
          isSending={false}
        />,
      )

      const textarea = screen.getByRole("textbox", { name: "Message the AI assistant" })
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

      expect(onSend).toHaveBeenCalledTimes(1)
    })

    it("does NOT send message on Shift + Enter (allows multiline)", () => {
      const onSend = vi.fn()
      const onStop = vi.fn()
      const onChange = vi.fn()

      render(
        <ChatComposer
          value="Line 1"
          onChange={onChange}
          onSend={onSend}
          onStop={onStop}
          disabled={false}
          isSending={false}
        />,
      )

      const textarea = screen.getByRole("textbox", { name: "Message the AI assistant" })
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true })

      expect(onSend).not.toHaveBeenCalled()
    })

    it("does NOT send message when input is empty or whitespace", () => {
      const onSend = vi.fn()
      const onStop = vi.fn()
      const onChange = vi.fn()

      render(
        <ChatComposer
          value="   "
          onChange={onChange}
          onSend={onSend}
          onStop={onStop}
          disabled={false}
          isSending={false}
        />,
      )

      const textarea = screen.getByRole("textbox", { name: "Message the AI assistant" })
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false })

      expect(onSend).not.toHaveBeenCalled()
    })

    it("renders Stop button while sending and triggers onStop when clicked", () => {
      const onSend = vi.fn()
      const onStop = vi.fn()
      const onChange = vi.fn()

      render(
        <ChatComposer
          value="Thinking..."
          onChange={onChange}
          onSend={onSend}
          onStop={onStop}
          disabled={false}
          isSending={true}
        />,
      )

      const stopButton = screen.getByRole("button", { name: "Stop generating" })
      expect(stopButton).toBeInTheDocument()
      fireEvent.click(stopButton)

      expect(onStop).toHaveBeenCalledTimes(1)
      expect(onSend).not.toHaveBeenCalled()
    })
  })

  describe("ChatMessageList interactions & smart scroll", () => {
    const mockMessages: ChatMessage[] = [
      {
        id: "msg-1",
        role: "user",
        content: "What is the architecture?",
        createdAt: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "Here is the table of services:\n\n| Service | Role |\n| --- | --- |\n| Auth | Security |\n| API | Gateway |\n",
        createdAt: "2026-01-01T12:00:05.000Z",
      },
    ]

    it("renders messages with proper roles, markdown table, and copy buttons", () => {
      render(
        <ChatMessageList
          messages={mockMessages}
          loading={false}
          sending={false}
          error={null}
          onRetry={vi.fn()}
          activeChatId="chat-1"
        />,
      )

      expect(screen.getByText("What is the architecture?")).toBeInTheDocument()
      expect(screen.getByText("Auth")).toBeInTheDocument()
      expect(screen.getByText("Security")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Copy/i })).toBeInTheDocument()
    })

    it("shows thinking indicator with accessible announcement when sending without stream chunks", () => {
      render(
        <ChatMessageList
          messages={mockMessages}
          loading={false}
          sending={true}
          error={null}
          onRetry={vi.fn()}
          activeChatId="chat-1"
        />,
      )

      expect(screen.getByText(/AI is thinking & analyzing parameters/i)).toBeInTheDocument()
    })

    it("shows scroll-to-latest button when scrolled up and scrolls to bottom on click", async () => {
      const { container } = render(
        <ChatMessageList
          messages={mockMessages}
          loading={false}
          sending={false}
          error={null}
          onRetry={vi.fn()}
          activeChatId="chat-1"
        />,
      )

      const scrollContainer = container.querySelector(".overflow-y-auto") as HTMLDivElement
      expect(scrollContainer).toBeInTheDocument()

      // Mock scroll dimensions to simulate being scrolled up
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true })
      Object.defineProperty(scrollContainer, "clientHeight", { value: 300, configurable: true })
      Object.defineProperty(scrollContainer, "scrollTop", { value: 100, configurable: true, writable: true })
      scrollContainer.scrollTo = vi.fn()

      // Trigger scroll event
      fireEvent.scroll(scrollContainer)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Scroll to latest message" })).toBeInTheDocument()
      })

      const latestButton = screen.getByRole("button", { name: "Scroll to latest message" })
      fireEvent.click(latestButton)

      expect(scrollContainer.scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" })
    })
  })
})
