"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ChatSidebar } from "@/components/ai/chat-sidebar"
import { ChatWindow, quickPrompts } from "@/components/ai/chat-window"
import { streamChatMessage } from "@/lib/api/ai-chat-stream"
import {
  ChatApiError,
  createChat,
  deleteChat,
  getChat,
  getChats,
  renameChat,
  type ChatMessage,
  type ChatSummary,
} from "@/lib/api/ai-chats"

type GenerationStatus = "starting" | "streaming" | "completed" | "cancelled" | "error"
type GenerationState = { requestId: string; status: GenerationStatus }

class StreamFailure extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "StreamFailure"
    this.code = code
  }
}

function sortChats(chats: ChatSummary[]): ChatSummary[] {
  return [...chats].sort((left, right) => {
    const updatedDifference = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    if (updatedDifference !== 0 && !Number.isNaN(updatedDifference)) return updatedDifference
    return right.id.localeCompare(left.id)
  })
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof ChatApiError && error.message) return error.message
  if (error instanceof StreamFailure && error.message) return error.message
  return fallback
}

function appendUniqueMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const existingIds = new Set(existing.map((message) => message.id))
  const additions = incoming.filter((message) => !existingIds.has(message.id))
  return [...existing, ...additions]
}

function createRequestId(): string {
  const browserCrypto = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined
  if (browserCrypto && typeof browserCrypto.randomUUID === "function") return browserCrypto.randomUUID()
  return `request-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isGeneratingStatus(status: GenerationStatus | undefined): boolean {
  return status === "starting" || status === "streaming"
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

function streamMessageId(requestId: string): string {
  return `stream-${requestId}`
}

export default function AIAssistantPage() {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({})
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({})
  const [sendingMessages, setSendingMessages] = useState<Record<string, boolean>>({})
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({})
  const [generationByChat, setGenerationByChat] = useState<Record<string, GenerationState>>({})
  const [errorByChat, setErrorByChat] = useState<Record<string, string | null>>({})
  const [listError, setListError] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [creatingChat, setCreatingChat] = useState(false)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const messageRequestIds = useRef<Record<string, number>>({})
  const chatListRequestIds = useRef(0)
  const deletedChatIds = useRef(new Set<string>())
  const abortControllers = useRef(new Map<string, AbortController>())
  const activeRequestIds = useRef(new Map<string, string>())
  const cancelledRequestIds = useRef(new Set<string>())
  const retryMessageIds = useRef<Record<string, string | undefined>>({})
  const requestContents = useRef<Record<string, string | undefined>>({})
  const pageMountedRef = useRef(true)

  const loadChatMessages = useCallback(async (chatId: string) => {
    const requestId = (messageRequestIds.current[chatId] ?? 0) + 1
    messageRequestIds.current[chatId] = requestId
    setLoadingMessages((previous) => ({ ...previous, [chatId]: true }))
    setErrorByChat((previous) => ({ ...previous, [chatId]: null }))

    try {
      const result = await getChat(chatId)
      if (messageRequestIds.current[chatId] !== requestId || deletedChatIds.current.has(chatId)) return
      setMessagesByChat((previous) => ({ ...previous, [chatId]: result.messages }))
      setChats((previous) =>
        sortChats(
          previous.map((chat) =>
            chat.id === chatId
              ? { ...chat, ...result.chat, messageCount: chat.messageCount }
              : chat,
          ),
        ),
      )
    } catch (error: unknown) {
      if (messageRequestIds.current[chatId] !== requestId || deletedChatIds.current.has(chatId)) return
      setErrorByChat((previous) => ({
        ...previous,
        [chatId]: errorText(error, "Unable to load this conversation."),
      }))
    } finally {
      if (messageRequestIds.current[chatId] === requestId && !deletedChatIds.current.has(chatId)) {
        setLoadingMessages((previous) => ({ ...previous, [chatId]: false }))
      }
    }
  }, [])

  const refreshChats = useCallback(async (selectMostRecent = false) => {
    const requestId = ++chatListRequestIds.current
    setLoadingChats(true)
    setListError(null)
    try {
      const nextChats = sortChats((await getChats()).filter((chat) => !deletedChatIds.current.has(chat.id)))
      if (requestId !== chatListRequestIds.current) return
      setChats(nextChats)

      if (selectMostRecent) {
        if (nextChats.length === 0) {
          setActiveChatId(null)
          setMessagesByChat({})
          return
        }

        const nextActiveId = nextChats[0].id
        setActiveChatId(nextActiveId)
        await loadChatMessages(nextActiveId)
      }
    } catch (error: unknown) {
      if (requestId !== chatListRequestIds.current) return
      setListError(errorText(error, "Unable to load your conversations."))
    } finally {
      if (requestId === chatListRequestIds.current) setLoadingChats(false)
    }
  }, [loadChatMessages])

  useEffect(() => {
    const ownedControllers = abortControllers.current
    const ownedRequestIds = activeRequestIds.current
    const ownedCancelledIds = cancelledRequestIds.current
    const ownedRetryIds = retryMessageIds.current
    const ownedContents = requestContents.current
    pageMountedRef.current = true
    void refreshChats(true)
    return () => {
      pageMountedRef.current = false
      ownedControllers.forEach((controller) => controller.abort())
      ownedControllers.clear()
      ownedRequestIds.clear()
      ownedCancelledIds.clear()
      for (const chatId of Object.keys(ownedRetryIds)) delete ownedRetryIds[chatId]
      for (const chatId of Object.keys(ownedContents)) delete ownedContents[chatId]
    }
  }, [refreshChats])

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  )
  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : []
  const activeLoading = activeChatId ? loadingMessages[activeChatId] ?? false : false
  const activeSending = activeChatId ? sendingMessages[activeChatId] ?? false : false
  const activeError = activeChatId ? errorByChat[activeChatId] ?? null : null
  const activeGeneration = activeChatId ? generationByChat[activeChatId] : undefined
  const activeGenerating = isGeneratingStatus(activeGeneration?.status)
  const generatingChatIds = useMemo(
    () => Object.entries(generationByChat)
      .filter(([, generation]) => isGeneratingStatus(generation.status))
      .map(([chatId]) => chatId),
    [generationByChat],
  )

  const focusComposer = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const invalidateChatListRefresh = useCallback(() => {
    chatListRequestIds.current += 1
    setLoadingChats(false)
  }, [])

  const removeStreamingMessage = useCallback((chatId: string, requestId: string) => {
    const temporaryId = streamMessageId(requestId)
    setMessagesByChat((previous) => {
      const current = previous[chatId] ?? []
      const filtered = current.filter((message) => message.id !== temporaryId)
      if (filtered.length === current.length) return previous
      return { ...previous, [chatId]: filtered }
    })
  }, [])

  const sendToChat = useCallback(async (
    requestChatId: string,
    content: string,
    retryMessageId?: string,
  ): Promise<boolean> => {
    if (deletedChatIds.current.has(requestChatId) || abortControllers.current.has(requestChatId)) return false

    const requestId = createRequestId()
    const controller = new AbortController()
    const temporaryId = streamMessageId(requestId)
    const createdAt = new Date().toISOString()
    let streamContent = ""
    let terminalStatus: GenerationStatus = "error"
    let completed = false

    abortControllers.current.set(requestChatId, controller)
    activeRequestIds.current.set(requestChatId, requestId)
    retryMessageIds.current[requestChatId] = undefined
    requestContents.current[requestChatId] = content
    // Invalidate an older detail fetch before the stream starts.
    messageRequestIds.current[requestChatId] = (messageRequestIds.current[requestChatId] ?? 0) + 1
    setSendingMessages((previous) => ({ ...previous, [requestChatId]: true }))
    setStreamingMessages((previous) => ({ ...previous, [requestChatId]: "" }))
    setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: "starting" } }))
    setErrorByChat((previous) => ({ ...previous, [requestChatId]: null }))

    const isCurrentRequest = () => activeRequestIds.current.get(requestChatId) === requestId
    const clearStreamState = () => {
      setStreamingMessages((previous) => {
        const next = { ...previous }
        delete next[requestChatId]
        return next
      })
      removeStreamingMessage(requestChatId, requestId)
    }

    try {
      const stream = streamChatMessage(requestChatId, content, {
        signal: controller.signal,
        requestId,
        retryMessageId,
      })

      for await (const event of stream) {
        if (!isCurrentRequest() || controller.signal.aborted || deletedChatIds.current.has(requestChatId)) return false
        if (event.requestId && event.requestId !== requestId) continue

        if (event.type === "user") {
          retryMessageIds.current[requestChatId] = event.userMessage.id
          setMessagesByChat((previous) => ({
            ...previous,
            [requestChatId]: appendUniqueMessages(previous[requestChatId] ?? [], [event.userMessage]),
          }))
          setGenerationByChat((previous) => ({
            ...previous,
            [requestChatId]: { requestId, status: "streaming" },
          }))
          continue
        }

        if (event.type === "chunk") {
          streamContent += event.text
          setStreamingMessages((previous) => ({ ...previous, [requestChatId]: streamContent }))
          setMessagesByChat((previous) => {
            const current = previous[requestChatId] ?? []
            const withoutTemporary = current.filter((message) => message.id !== temporaryId)
            return {
              ...previous,
              [requestChatId]: [
                ...withoutTemporary,
                {
                  id: temporaryId,
                  role: "assistant" as const,
                  content: streamContent,
                  createdAt,
                },
              ],
            }
          })
          setGenerationByChat((previous) => ({
            ...previous,
            [requestChatId]: { requestId, status: "streaming" },
          }))
          continue
        }

        if (event.type === "done") {
          if (event.chatId !== requestChatId) continue
          setMessagesByChat((previous) => {
            const current = previous[requestChatId] ?? []
            const withoutTemporary = current.filter((message) => message.id !== temporaryId)
            return {
              ...previous,
              [requestChatId]: appendUniqueMessages(withoutTemporary, [event.assistantMessage]),
            }
          })
          setStreamingMessages((previous) => {
            const next = { ...previous }
            delete next[requestChatId]
            return next
          })
          if (event.updatedAt) {
            setChats((previous) => sortChats(previous.map((chat) => (
              chat.id === requestChatId ? { ...chat, updatedAt: event.updatedAt ?? chat.updatedAt } : chat
            ))))
          }
          setErrorByChat((previous) => ({ ...previous, [requestChatId]: null }))
          setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: "completed" } }))
          retryMessageIds.current[requestChatId] = undefined
          requestContents.current[requestChatId] = undefined
          terminalStatus = "completed"
          completed = true
          void refreshChats(false)
          return true
        }

        if (event.type === "error") {
          throw new StreamFailure(event.message, event.code)
        }

        if (event.type === "cancelled") {
          terminalStatus = "cancelled"
          clearStreamState()
          setErrorByChat((previous) => ({ ...previous, [requestChatId]: null }))
          setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: "cancelled" } }))
          return false
        }
      }

      // A well-formed stream must finalize with a done event.
      throw new StreamFailure("Generation failed. Retry.")
    } catch (error: unknown) {
      if (!isCurrentRequest()) return false
      if (controller.signal.aborted || isAbortError(error)) {
        terminalStatus = "cancelled"
        clearStreamState()
        setErrorByChat((previous) => ({ ...previous, [requestChatId]: null }))
        setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: "cancelled" } }))
        return false
      }

      clearStreamState()
      setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: "error" } }))
      // Phase 1 may have persisted the user message before AI generation failed.
      // Reload this exact session so a retry cannot create a duplicate user message.
      await loadChatMessages(requestChatId)
      if (isCurrentRequest()) {
        setErrorByChat((previous) => ({
          ...previous,
          [requestChatId]: errorText(error, "Generation failed. Retry."),
        }))
      }
      return false
    } finally {
      if (isCurrentRequest()) {
        abortControllers.current.delete(requestChatId)
        activeRequestIds.current.delete(requestChatId)
        setSendingMessages((previous) => {
          const next = { ...previous }
          delete next[requestChatId]
          return next
        })
        if (!completed && terminalStatus !== "cancelled") {
          setGenerationByChat((previous) => ({ ...previous, [requestChatId]: { requestId, status: terminalStatus } }))
        }
      }
      cancelledRequestIds.current.delete(requestId)
    }
  }, [loadChatMessages, refreshChats, removeStreamingMessage])

  const stopGeneration = useCallback((chatId: string) => {
    const requestId = activeRequestIds.current.get(chatId)
    const controller = abortControllers.current.get(chatId)
    if (!requestId || !controller) return

    cancelledRequestIds.current.add(requestId)
    activeRequestIds.current.delete(chatId)
    abortControllers.current.delete(chatId)
    controller.abort()
    setSendingMessages((previous) => {
      const next = { ...previous }
      delete next[chatId]
      return next
    })
    setStreamingMessages((previous) => {
      const next = { ...previous }
      delete next[chatId]
      return next
    })
    removeStreamingMessage(chatId, requestId)
    setErrorByChat((previous) => ({ ...previous, [chatId]: null }))
    setGenerationByChat((previous) => ({ ...previous, [chatId]: { requestId, status: "cancelled" } }))
  }, [removeStreamingMessage])

  const handleSelectChat = useCallback((chatId: string) => {
    if (deletedChatIds.current.has(chatId)) return
    setActiveChatId(chatId)
    setMobileSidebarOpen(false)
    if (!Object.prototype.hasOwnProperty.call(messagesByChat, chatId)) {
      void loadChatMessages(chatId)
    }
  }, [loadChatMessages, messagesByChat])

  const handleNewChat = useCallback(async () => {
    if (creatingChat) return
    invalidateChatListRefresh()
    setCreatingChat(true)
    setListError(null)
    try {
      const chat = await createChat()
      if (deletedChatIds.current.has(chat.id)) return
      setChats((previous) => sortChats([chat, ...previous.filter((item) => item.id !== chat.id)]))
      setMessagesByChat((previous) => ({ ...previous, [chat.id]: [] }))
      setErrorByChat((previous) => ({ ...previous, [chat.id]: null }))
      setActiveChatId(chat.id)
      setInput("")
      setMobileSidebarOpen(false)
      focusComposer()
    } catch (error: unknown) {
      setListError(errorText(error, "Unable to start a new conversation."))
    } finally {
      setCreatingChat(false)
    }
  }, [creatingChat, focusComposer, invalidateChatListRefresh])

  const handleSend = useCallback(async (textToSend?: string) => {
    const content = (textToSend ?? input).trim()
    if (!content) return
    if (activeChatId && abortControllers.current.has(activeChatId)) return
    setInput("")

    if (activeChatId) {
      const requestChatId = activeChatId
      await sendToChat(requestChatId, content)
      return
    }

    if (creatingChat) return
    invalidateChatListRefresh()
    setCreatingChat(true)
    setListError(null)
    try {
      const chat = await createChat()
      if (deletedChatIds.current.has(chat.id)) return
      setChats((previous) => sortChats([chat, ...previous.filter((item) => item.id !== chat.id)]))
      setMessagesByChat((previous) => ({ ...previous, [chat.id]: [] }))
      setErrorByChat((previous) => ({ ...previous, [chat.id]: null }))
      setActiveChatId(chat.id)
      await sendToChat(chat.id, content)
      focusComposer()
    } catch (error: unknown) {
      setListError(errorText(error, "Unable to start a new conversation."))
    } finally {
      setCreatingChat(false)
    }
  }, [activeChatId, creatingChat, focusComposer, input, invalidateChatListRefresh, sendToChat])

  const handlePrompt = useCallback((prompt: string) => {
    void handleSend(prompt)
  }, [handleSend])

  const openRenameDialog = useCallback((chatId: string) => {
    const chat = chats.find((item) => item.id === chatId)
    if (!chat) return
    setMobileSidebarOpen(false)
    setRenamingChatId(chatId)
    setRenameTitle(chat.title)
    setRenameError(null)
  }, [chats])

  const submitRename = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renamingChatId) return
    const title = renameTitle.trim()
    if (!title) {
      setRenameError("Chat title cannot be empty.")
      return
    }

    invalidateChatListRefresh()
    setRenaming(true)
    setRenameError(null)
    try {
      const updatedChat = await renameChat(renamingChatId, title)
      setChats((previous) => sortChats(previous.map((chat) => (chat.id === updatedChat.id ? { ...chat, ...updatedChat } : chat))))
      setRenamingChatId(null)
    } catch (error: unknown) {
      setRenameError(errorText(error, "Unable to rename this conversation."))
    } finally {
      setRenaming(false)
    }
  }, [invalidateChatListRefresh, renameTitle, renamingChatId])

  const openDeleteDialog = useCallback((chatId: string) => {
    setMobileSidebarOpen(false)
    setDeletingChatId(chatId)
    setDeleteError(null)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deletingChatId) return
    const chatId = deletingChatId
    invalidateChatListRefresh()
    setDeleting(true)
    setDeleteError(null)
    deletedChatIds.current.add(chatId)
    stopGeneration(chatId)

    try {
      await deleteChat(chatId)
      const remainingChats = chats.filter((chat) => chat.id !== chatId)
      setChats(remainingChats)
      setMessagesByChat((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      setErrorByChat((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      setLoadingMessages((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      setSendingMessages((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      setStreamingMessages((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      setGenerationByChat((previous) => {
        const next = { ...previous }
        delete next[chatId]
        return next
      })
      retryMessageIds.current[chatId] = undefined
      requestContents.current[chatId] = undefined

      if (activeChatId === chatId) {
        const nextActiveId = remainingChats[0]?.id ?? null
        setActiveChatId(nextActiveId)
        if (nextActiveId && !Object.prototype.hasOwnProperty.call(messagesByChat, nextActiveId)) {
          void loadChatMessages(nextActiveId)
        }
      }
      setDeletingChatId(null)
    } catch (error: unknown) {
      deletedChatIds.current.delete(chatId)
      setDeleteError(errorText(error, "Unable to delete this conversation."))
    } finally {
      setDeleting(false)
    }
  }, [activeChatId, chats, deletingChatId, invalidateChatListRefresh, loadChatMessages, messagesByChat, stopGeneration])

  const retryGeneration = useCallback((chatId: string) => {
    if (abortControllers.current.has(chatId)) return
    const messages = messagesByChat[chatId] ?? []
    const savedRetryId = retryMessageIds.current[chatId]
    const requestedContent = requestContents.current[chatId]
    const retryMessage = savedRetryId
      ? messages.find((message) => message.id === savedRetryId && message.role === "user")
      : [...messages].reverse().find((message) => message.role === "user" && message.content === requestedContent)

    if (!retryMessage) {
      // Do not retry an older user message when the failed request never
      // reached the server and therefore has no durable message id.
      void loadChatMessages(chatId)
      return
    }
    void sendToChat(chatId, retryMessage.content, retryMessage.id)
  }, [loadChatMessages, messagesByChat, sendToChat])

  const retryActiveChat = useCallback(() => {
    if (activeChatId) retryGeneration(activeChatId)
  }, [activeChatId, retryGeneration])

  const activeChatTitle = activeChat?.title ?? "New conversation"
  const quickPromptDisabled = creatingChat || (activeChatId ? activeSending || activeGenerating : false)

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-[1500px] flex-col gap-4 p-4 font-sans sm:p-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[#E5DFD4] pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link href="/projects" aria-label="Back to projects">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5DFD4] bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F472B6]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">AI Assistant</h1>
              <span className="rounded-full bg-[#F8B4D9] px-2.5 py-0.5 text-[10px] font-extrabold text-neutral-900">Copilot 3.5</span>
            </div>
            <p className="text-xs text-neutral-500">Persistent conversations for your enterprise transformation work.</p>
          </div>
        </div>

        <Link href="/projects">
          <button className="flex items-center gap-2 rounded-full bg-[#18181C] px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-neutral-800">
            <span>Return to Projects Dashboard</span>
          </button>
        </Link>
      </header>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs font-bold text-neutral-400">Prompts:</span>
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handlePrompt(prompt)}
            disabled={quickPromptDisabled}
            className="shrink-0 rounded-full border border-[#E5DFD4] bg-[#FAF8F2] px-3.5 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition hover:bg-[#FEE895] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="hidden w-[260px] shrink-0 lg:block">
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            loading={loadingChats}
            error={listError}
            generatingChatIds={generatingChatIds}
            onNewChat={() => void handleNewChat()}
            onSelectChat={handleSelectChat}
            onRenameChat={openRenameDialog}
            onDeleteChat={openDeleteDialog}
            onRetry={() => void refreshChats(true)}
            newChatDisabled={creatingChat}
            className="h-full"
          />
        </div>

        <ChatWindow
          activeChat={activeChat}
          messages={activeMessages}
          input={input}
          loading={activeLoading}
          sending={activeSending}
          generationStatus={activeGeneration?.status}
          streamingText={activeChatId ? streamingMessages[activeChatId] : undefined}
          error={activeError}
          inputRef={inputRef}
          onInputChange={setInput}
          onSend={() => void handleSend()}
          onStop={() => activeChatId && stopGeneration(activeChatId)}
          onNewChat={() => void handleNewChat()}
          onPrompt={handlePrompt}
          onRetry={retryActiveChat}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />
      </div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[86vw] max-w-xs border-none bg-transparent p-3 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>AI chat history</SheetTitle>
            <SheetDescription>Select a saved conversation or start a new one.</SheetDescription>
          </SheetHeader>
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            loading={loadingChats}
            error={listError}
            generatingChatIds={generatingChatIds}
            onNewChat={() => void handleNewChat()}
            onSelectChat={handleSelectChat}
            onRenameChat={openRenameDialog}
            onDeleteChat={openDeleteDialog}
            onRetry={() => void refreshChats(true)}
            newChatDisabled={creatingChat}
            className="h-full"
          />
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(renamingChatId)} onOpenChange={(open) => { if (!open && !renaming) setRenamingChatId(null) }}>
        <DialogContent className="border-[#E5DFD4] bg-[#FAF8F2]">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this conversation a clear, memorable name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRename} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="chat-title" className="text-xs font-bold text-neutral-700">Title</label>
              <Input
                id="chat-title"
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value)}
                maxLength={120}
                autoFocus
                disabled={renaming}
                className="rounded-xl border-[#E5DFD4] bg-white text-sm"
              />
              {renameError && <p className="text-xs text-red-600">{renameError}</p>}
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setRenamingChatId(null)} disabled={renaming} className="rounded-full px-4 py-2 text-xs font-bold text-neutral-600 transition hover:bg-white disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={renaming || !renameTitle.trim()} className="inline-flex items-center gap-2 rounded-full bg-[#18181C] px-4 py-2 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:opacity-50">
                {renaming && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Save title
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingChatId)} onOpenChange={(open) => { if (!open && !deleting) setDeletingChatId(null) }}>
        <DialogContent className="border-[#E5DFD4] bg-[#FAF8F2]">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This permanently removes the conversation and its saved messages.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{deleteError}</p>}
          <DialogFooter>
            <button type="button" onClick={() => setDeletingChatId(null)} disabled={deleting} className="rounded-full px-4 py-2 text-xs font-bold text-neutral-600 transition hover:bg-white disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={() => void confirmDelete()} disabled={deleting} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
              {deleting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Delete chat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <span className="sr-only" aria-live="polite">
        {activeChatTitle}
        {activeGenerating ? " is generating a response" : ""}
      </span>
    </div>
  )
}
