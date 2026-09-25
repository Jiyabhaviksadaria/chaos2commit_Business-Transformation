export type ChatKind = "DISCOVERY" | "CONSULTANT" | "COMPANION"
export type ChatRole = "user" | "assistant" | "system"

export type ChatSummary = {
  id: string
  title: string
  kind: ChatKind
  createdAt: string
  updatedAt: string
  messageCount?: number
}

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

type ApiChat = {
  id: string
  title: string
  kind: ChatKind
  createdAt: string
  updatedAt: string
  messageCount?: number
}

type ApiChatMessage = {
  id: string
  role: "USER" | "ASSISTANT" | "SYSTEM"
  content: string
  createdAt: string
}

type ChatListResponse = { chats: ApiChat[] }
type ChatResponse = { chat: ApiChat }
type ChatDetailResponse = { chat: ApiChat; messages: ApiChatMessage[] }
type MessageResponse = { userMessage: ApiChatMessage; assistantMessage: ApiChatMessage }
type DeleteResponse = { success: true }

export class ChatApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ChatApiError"
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function getErrorMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error
  }
  if (status === 401) return "Authentication required."
  return "The AI chat service is temporarily unavailable."
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new ChatApiError(getErrorMessage(payload, response.status), response.status)
  }

  return payload as T
}

function toChatRole(role: ApiChatMessage["role"]): ChatRole {
  if (role === "ASSISTANT") return "assistant"
  if (role === "SYSTEM") return "system"
  return "user"
}

export function normalizeChatMessage(message: ApiChatMessage): ChatMessage {
  return {
    id: message.id,
    role: toChatRole(message.role),
    content: message.content,
    createdAt: message.createdAt,
  }
}

function toChatSummary(chat: ApiChat): ChatSummary {
  return {
    id: chat.id,
    title: chat.title,
    kind: chat.kind,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    ...(typeof chat.messageCount === "number" ? { messageCount: chat.messageCount } : {}),
  }
}

export async function getChats(): Promise<ChatSummary[]> {
  const response = await request<ChatListResponse>("/api/ai/chats")
  return response.chats.map(toChatSummary)
}

export async function createChat(title?: string): Promise<ChatSummary> {
  const response = await request<ChatResponse>("/api/ai/chats", {
    method: "POST",
    body: JSON.stringify(title === undefined ? {} : { title }),
  })
  return toChatSummary(response.chat)
}

export async function getChat(sessionId: string): Promise<{ chat: ChatSummary; messages: ChatMessage[] }> {
  const response = await request<ChatDetailResponse>(`/api/ai/chats/${encodeURIComponent(sessionId)}`)
  return {
    chat: toChatSummary(response.chat),
    messages: response.messages.map(normalizeChatMessage),
  }
}

export async function renameChat(sessionId: string, title: string): Promise<ChatSummary> {
  const response = await request<ChatResponse>(`/api/ai/chats/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  })
  return toChatSummary(response.chat)
}

export async function deleteChat(sessionId: string): Promise<void> {
  await request<DeleteResponse>(`/api/ai/chats/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  })
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
  retryMessageId?: string,
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const response = await request<MessageResponse>(`/api/ai/chats/${encodeURIComponent(sessionId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, ...(retryMessageId ? { retryMessageId } : {}) }),
  })
  return {
    userMessage: normalizeChatMessage(response.userMessage),
    assistantMessage: normalizeChatMessage(response.assistantMessage),
  }
}
