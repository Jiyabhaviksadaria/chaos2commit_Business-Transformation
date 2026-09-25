import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatStreamEvent } from "@/lib/api/ai-chat-stream"

const api = vi.hoisted(() => ({
  getChats: vi.fn(),
  createChat: vi.fn(),
  getChat: vi.fn(),
  renameChat: vi.fn(),
  deleteChat: vi.fn(),
  sendChatMessage: vi.fn(),
  streamChatMessage: vi.fn(),
}))

vi.mock("@/lib/api/ai-chats", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/ai-chats")>("@/lib/api/ai-chats")
  return { ...actual, ...api }
})

vi.mock("@/lib/api/ai-chat-stream", () => ({
  streamChatMessage: api.streamChatMessage,
}))

import AIAssistantPage from "@/app/app/ai/page"

const chatA = {
  id: "chat-a",
  title: "CRM Analysis",
  kind: "CONSULTANT" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-03T00:00:00.000Z",
  messageCount: 2,
}

const chatB = {
  id: "chat-b",
  title: "Inventory Planning",
  kind: "CONSULTANT" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  messageCount: 1,
}

const messageA = {
  id: "message-a",
  role: "user" as const,
  content: "CRM question",
  createdAt: "2026-01-03T00:00:00.000Z",
}

const messageB = {
  id: "message-b",
  role: "assistant" as const,
  content: "Inventory answer",
  createdAt: "2026-01-02T00:00:00.000Z",
}

function detailFor(chatId: string) {
  if (chatId === chatB.id) return { chat: chatB, messages: [messageB] }
  return { chat: chatA, messages: [messageA] }
}

function firstButton(name: RegExp | string) {
  return screen.getAllByRole("button", { name })[0]
}

type StreamControl = {
  signal?: AbortSignal
  requestId?: string
  push: (event: ChatStreamEvent) => void
}

function installDeferredStreams() {
  const controls = new Map<string, StreamControl>()

  api.streamChatMessage.mockImplementation((chatId: string, content: string, options?: { signal?: AbortSignal; requestId?: string }) => {
    const queue: ChatStreamEvent[] = []
    let waiter: ((event: ChatStreamEvent) => void) | undefined
    const control: StreamControl = {
      signal: options?.signal,
      requestId: options?.requestId,
      push: (event) => {
        if (waiter) {
          const resolve = waiter
          waiter = undefined
          resolve(event)
        } else {
          queue.push(event)
        }
      },
    }
    controls.set(chatId, control)

    return (async function* () {
      yield {
        type: "user" as const,
        userMessage: {
          id: `${chatId}-user`,
          role: "user" as const,
          content,
          createdAt: "2026-01-03T01:00:00.000Z",
        },
      }
      while (true) {
        const event = queue.length > 0
          ? queue.shift()
          : await new Promise<ChatStreamEvent>((resolve) => { waiter = resolve })
        if (event) yield event
      }
    })()
  })

  return controls
}

function doneEvent(chatId: string, content: string): ChatStreamEvent {
  return {
    type: "done",
    chatId,
    messageId: `${chatId}-assistant`,
    updatedAt: "2026-01-03T01:00:02.000Z",
    assistantMessage: {
      id: `${chatId}-assistant`,
      role: "assistant",
      content,
      createdAt: "2026-01-03T01:00:02.000Z",
    },
  }
}

describe("AI Assistant multi-chat UI", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    api.getChats.mockResolvedValue([chatA, chatB])
    api.getChat.mockImplementation(async (chatId: string) => detailFor(chatId))
    api.createChat.mockResolvedValue({
      ...chatA,
      id: "chat-new",
      title: "New chat",
      messageCount: 0,
    })
    api.sendChatMessage.mockResolvedValue({
      userMessage: { id: "message-new-user", role: "user", content: "New question", createdAt: "2026-01-03T01:00:00.000Z" },
      assistantMessage: { id: "message-new-assistant", role: "assistant", content: "New answer", createdAt: "2026-01-03T01:00:01.000Z" },
    })
    api.streamChatMessage.mockImplementation(async function* (chatId: string, content: string) {
      const response = await api.sendChatMessage(chatId, content)
      yield { type: "user" as const, userMessage: response.userMessage }
      yield { type: "chunk" as const, text: response.assistantMessage.content }
      yield {
        type: "done" as const,
        chatId,
        messageId: response.assistantMessage.id,
        assistantMessage: response.assistantMessage,
        updatedAt: "2026-01-03T01:00:01.000Z",
      }
    })
    api.renameChat.mockResolvedValue({ ...chatA, title: "Renamed CRM" })
    api.deleteChat.mockResolvedValue(undefined)
  })

  it("loads the chat list, selects the most recent chat, and renders its messages", async () => {
    render(<AIAssistantPage />)

    await waitFor(() => expect(api.getChat).toHaveBeenCalledWith(chatA.id))
    expect(screen.getAllByText(chatA.title).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: new RegExp(chatA.title) })[0]).toHaveAttribute("aria-current", "page")
    expect(screen.getByText(messageA.content)).toBeInTheDocument()
    expect(screen.getByText(chatB.title)).toBeInTheDocument()
  })

  it("creates a server-backed chat from the New Chat action", async () => {
    render(<AIAssistantPage />)
    await waitFor(() => expect(api.getChat).toHaveBeenCalled())

    fireEvent.click(firstButton("New Chat"))

    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(1))
    expect(api.createChat).toHaveBeenCalledWith()
    expect(screen.getAllByText("New chat").length).toBeGreaterThan(0)
  })

  it("loads a selected chat without mixing its messages with the previous chat", async () => {
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    fireEvent.click(firstButton(new RegExp(chatB.title)))

    await waitFor(() => expect(screen.getByText(messageB.content)).toBeInTheDocument())
    expect(screen.queryByText(messageA.content)).not.toBeInTheDocument()
  })

  it("sends a message to the active session and appends the returned messages", async () => {
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "New question" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(chatA.id, "New question"))
    expect(await screen.findByText("New answer")).toBeInTheDocument()
    expect(screen.getByText("New question")).toBeInTheDocument()
  })

  it("does not append a returned message when its ID is already present", async () => {
    api.sendChatMessage.mockResolvedValue({
      userMessage: { ...messageA, content: "Duplicate content" },
      assistantMessage: { ...messageB, id: "unique-assistant", content: "Unique answer" },
    })
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Duplicate request" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(api.streamChatMessage).toHaveBeenCalled())

    expect(await screen.findByText("Unique answer")).toBeInTheDocument()
    expect(screen.getAllByText(messageA.content)).toHaveLength(1)
    expect(screen.queryByText("Duplicate content")).not.toBeInTheDocument()
  })

  it("keeps an in-flight response associated with its captured chat after switching chats", async () => {
    let resolveSend: ((value: {
      userMessage: typeof messageA
      assistantMessage: typeof messageB
    }) => void) | undefined
    api.sendChatMessage.mockImplementation(() => new Promise((resolve) => {
      resolveSend = resolve
    }))

    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Question for A" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith(chatA.id, "Question for A"))

    fireEvent.click(firstButton(new RegExp(chatB.title)))
    await waitFor(() => expect(screen.getByText(messageB.content)).toBeInTheDocument())

    await act(async () => {
      resolveSend?.({
        userMessage: { ...messageA, id: "a-user", content: "Question for A" },
        assistantMessage: { ...messageB, id: "a-assistant", content: "Answer for A" },
      })
    })

    expect(screen.queryByText("Answer for A")).not.toBeInTheDocument()
    expect(screen.getByText(messageB.content)).toBeInTheDocument()

    fireEvent.click(firstButton(new RegExp(chatA.title)))
    expect(await screen.findByText("Answer for A")).toBeInTheDocument()
  }, 15000)

  it("uses the real create-and-send flow for a quick prompt from the empty state", async () => {
    const createdChat = { ...chatA, id: "chat-new", title: "New chat", messageCount: 0 }
    api.getChats.mockResolvedValueOnce([]).mockResolvedValue([createdChat])
    api.createChat.mockResolvedValue(createdChat)
    render(<AIAssistantPage />)

    await waitFor(() => expect(screen.getByText("Start a conversation")).toBeInTheDocument())
    fireEvent.click(firstButton("Analyze CRM Lead Management Bottlenecks"))

    await waitFor(() => expect(api.createChat).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(api.sendChatMessage).toHaveBeenCalledWith("chat-new", "Analyze CRM Lead Management Bottlenecks"))
    expect(await screen.findByText("New answer")).toBeInTheDocument()
  })

  it("reloads the same chat after a send failure instead of optimistically duplicating messages", async () => {
    api.sendChatMessage.mockRejectedValue(new Error("provider unavailable"))
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Question that may be persisted" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    expect(await screen.findByText("Generation failed. Retry.")).toBeInTheDocument()
    expect(screen.getAllByText(messageA.content).length).toBe(1)
    expect(api.sendChatMessage).toHaveBeenCalledWith(chatA.id, "Question that may be persisted")
  })

  it("streams Chat A and Chat B concurrently without cross-chat contamination", async () => {
    const controls = installDeferredStreams()
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    let input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Question for A" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatA.id)).toBe(true))
    expect(await screen.findByText("Question for A")).toBeInTheDocument()
    await act(async () => {
      controls.get(chatA.id)?.push({ type: "chunk", requestId: "stale-request", text: "stale A" })
      await Promise.resolve()
    })
    expect(screen.queryByText("stale A")).not.toBeInTheDocument()

    fireEvent.click(firstButton(new RegExp(chatB.title)))
    await waitFor(() => expect(screen.getByText(messageB.content)).toBeInTheDocument())
    input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Question for B" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatB.id)).toBe(true))
    expect(await screen.findByText("Question for B")).toBeInTheDocument()

    act(() => {
      controls.get(chatA.id)?.push({ type: "chunk", text: "CRM " })
      controls.get(chatB.id)?.push({ type: "chunk", text: "Inventory " })
    })
    await waitFor(() => expect(screen.getByText((_, element) => element?.textContent === "Inventory ")).toBeInTheDocument())
    expect(screen.queryAllByText((_, element) => element?.textContent === "CRM ")).toHaveLength(0)
    expect(screen.getAllByText("Generating...").length).toBeGreaterThanOrEqual(2)

    await act(async () => {
      controls.get(chatA.id)?.push({ type: "chunk", text: "analysis" })
      controls.get(chatB.id)?.push({ type: "chunk", text: "workflow" })
      controls.get(chatB.id)?.push(doneEvent(chatB.id, "Inventory workflow"))
      await Promise.resolve()
    })
    expect(await screen.findByText("Inventory workflow")).toBeInTheDocument()
    expect(screen.queryByText("CRM analysis")).not.toBeInTheDocument()

    fireEvent.click(firstButton(new RegExp(chatA.title)))
    expect(await screen.findByText("CRM analysis")).toBeInTheDocument()

    await act(async () => {
      controls.get(chatA.id)?.push(doneEvent(chatA.id, "CRM analysis"))
      await Promise.resolve()
    })
    expect(await screen.findByText("CRM analysis")).toBeInTheDocument()
  }, 15000)

  it("stops only the selected chat and ignores late chunks from its aborted request", async () => {
    const controls = installDeferredStreams()
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    let input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Stop A" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatA.id)).toBe(true))

    fireEvent.click(firstButton(new RegExp(chatB.title)))
    await waitFor(() => expect(screen.getByText(messageB.content)).toBeInTheDocument())
    input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Continue B" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatB.id)).toBe(true))

    fireEvent.click(firstButton(new RegExp(chatA.title)))
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument())
    const stop = screen.getByRole("button", { name: "Stop generating" })
    fireEvent.click(stop)

    expect(controls.get(chatA.id)?.signal?.aborted).toBe(true)
    act(() => {
      controls.get(chatA.id)?.push({ type: "chunk", text: "late A" })
      controls.get(chatB.id)?.push({ type: "chunk", text: "B continues" })
      controls.get(chatB.id)?.push(doneEvent(chatB.id, "B completed"))
    })

    fireEvent.click(firstButton(new RegExp(chatB.title)))
    expect(await screen.findByText("B completed")).toBeInTheDocument()
    expect(screen.queryByText("late A")).not.toBeInTheDocument()

    fireEvent.click(firstButton(new RegExp(chatA.title)))
    expect(await screen.findByText("Generation stopped. You can retry this request.")).toBeInTheDocument()
    expect(screen.queryByText("late A")).not.toBeInTheDocument()
  }, 15000)

  it("allows only one active request per chat while allowing another chat to start", async () => {
    const controls = installDeferredStreams()
    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText(messageA.content)).toBeInTheDocument())

    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "First A" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatA.id)).toBe(true))
    fireEvent.change(input, { target: { value: "Second A" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    expect(api.streamChatMessage).toHaveBeenCalledTimes(1)

    fireEvent.click(firstButton(new RegExp(chatB.title)))
    await waitFor(() => expect(screen.getByText(messageB.content)).toBeInTheDocument())
    const bInput = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(bInput, { target: { value: "First B" } })
    fireEvent.submit(bInput.closest("form") as HTMLFormElement)
    await waitFor(() => expect(controls.has(chatB.id)).toBe(true))
    expect(api.streamChatMessage).toHaveBeenCalledTimes(2)
  })

  it("shows a recoverable stream error and retries the saved user message", async () => {
    const calls: Array<{ chatId: string; retryMessageId?: string }> = []
    api.streamChatMessage.mockImplementation(async function* (chatId: string, content: string, options?: { retryMessageId?: string }) {
      calls.push({ chatId, retryMessageId: options?.retryMessageId })
      yield { type: "user" as const, userMessage: { id: "saved-user", role: "user" as const, content, createdAt: "2026-01-03T01:00:00.000Z" } }
      if (calls.length === 1) {
        yield { type: "error" as const, message: "Generation failed. Retry.", code: "GENERATION_FAILED" }
        return
      }
      yield doneEvent(chatId, "Recovered answer")
    })
    api.getChat.mockImplementation(async (chatId: string) => {
      if (chatId === chatA.id) return { chat: chatA, messages: [{ ...messageA, id: "saved-user", content: "Retry question" }] }
      return detailFor(chatId)
    })

    render(<AIAssistantPage />)
    await waitFor(() => expect(screen.getByText("Retry question")).toBeInTheDocument())
    const input = screen.getByRole("textbox", { name: "Message the AI assistant" })
    fireEvent.change(input, { target: { value: "Retry question" } })
    fireEvent.submit(input.closest("form") as HTMLFormElement)

    expect(await screen.findByText("Generation failed. Retry.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(await screen.findByText("Recovered answer")).toBeInTheDocument()
    expect(calls[1]).toEqual({ chatId: chatA.id, retryMessageId: "saved-user" })
  }, 15000)
})
