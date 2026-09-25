export interface TeamUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  companyRole?: string | null
  department?: string | null
  orgRole?: string
  role?: string
}

export interface TeamReaction {
  id: string
  emoji: string
  userId: string
  userName: string | null
}

export interface TeamMessageItem {
  id: string
  conversationId: string
  senderId: string
  sender: TeamUser
  content: string
  editedAt: string | null
  createdAt: string
  reactions: TeamReaction[]
}

export interface TeamConversationItem {
  id: string
  workspaceId: string
  projectId: string | null
  projectName?: string | null
  type: "CHANNEL" | "DIRECT_MESSAGE" | "GROUP"
  name: string | null
  description: string | null
  isPrivate: boolean
  lastMessageAt: string | null
  unreadCount: number
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    senderName: string
  } | null
  members: TeamUser[]
}

export interface TeamWorkspaceInfo {
  workspace: {
    id: string
    name: string
    description: string | null
    organizationId: string
  }
  currentUser: TeamUser
  members: TeamUser[]
  projects: Array<{
    id: string
    name: string
    industry?: string | null
    businessGoal?: string | null
  }>
}

export class TeamChatApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "TeamChatApiError"
    this.status = status
  }
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

  let payload: Record<string, unknown> | null = null
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    payload = null
  }

  if (!response.ok) {
    const errorMsg =
      (typeof payload?.error === "string" ? payload.error : null) ||
      (response.status === 401 ? "Authentication required." : "Service error")
    throw new TeamChatApiError(errorMsg, response.status)
  }

  return payload as T
}

export async function getWorkspaceInfo(workspaceId?: string): Promise<TeamWorkspaceInfo> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
  return request<TeamWorkspaceInfo>(`/api/team-chat/workspace${qs}`)
}

export async function getConversations(workspaceId?: string): Promise<TeamConversationItem[]> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
  const data = await request<{ conversations: TeamConversationItem[] }>(`/api/team-chat/conversations${qs}`)
  return data.conversations
}

export async function createConversation(
  payload: {
    type: "CHANNEL" | "DIRECT_MESSAGE" | "GROUP"
    name?: string
    description?: string
    isPrivate?: boolean
    projectId?: string
    recipientUserId?: string
    memberUserIds?: string[]
  },
  workspaceId?: string
): Promise<TeamConversationItem> {
  const qs = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""
  const data = await request<{ conversation: TeamConversationItem }>(`/api/team-chat/conversations${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data.conversation
}

export async function getConversationDetails(conversationId: string): Promise<TeamConversationItem> {
  const data = await request<{ conversation: TeamConversationItem }>(
    `/api/team-chat/conversations/${encodeURIComponent(conversationId)}`
  )
  return data.conversation
}

export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: string }
): Promise<{ messages: TeamMessageItem[]; hasMore: boolean; nextCursor: string | null }> {
  const params = new URLSearchParams()
  if (options?.limit) params.set("limit", options.limit.toString())
  if (options?.before) params.set("before", options.before)

  const qs = params.toString() ? `?${params.toString()}` : ""
  return request<{ messages: TeamMessageItem[]; hasMore: boolean; nextCursor: string | null }>(
    `/api/team-chat/conversations/${encodeURIComponent(conversationId)}/messages${qs}`
  )
}

export async function sendTeamMessage(
  conversationId: string,
  content: string
): Promise<TeamMessageItem> {
  const data = await request<{ message: TeamMessageItem }>(
    `/api/team-chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  )
  return data.message
}

export async function editTeamMessage(
  messageId: string,
  content: string
): Promise<TeamMessageItem> {
  const data = await request<{ message: TeamMessageItem }>(
    `/api/team-chat/messages/${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  )
  return data.message
}

export async function deleteTeamMessage(messageId: string): Promise<void> {
  await request<{ success: true }>(`/api/team-chat/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  })
}

export async function markConversationAsRead(conversationId: string): Promise<void> {
  await request<{ success: true }>(`/api/team-chat/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
  })
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<TeamReaction[]> {
  const data = await request<{ success: true; reactions: TeamReaction[] }>(
    `/api/team-chat/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    }
  )
  return data.reactions
}
