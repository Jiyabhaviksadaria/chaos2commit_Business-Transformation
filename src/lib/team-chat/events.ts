import { EventEmitter } from "events"

export type TeamChatEventType =
  | "message:new"
  | "message:edit"
  | "message:delete"
  | "conversation:new"
  | "conversation:read"
  | "reaction:update"

export interface TeamChatEvent {
  type: TeamChatEventType
  workspaceId: string
  conversationId: string
  targetUserIds?: string[] // If restricted (e.g. private channel, DM), only emit to these users
  payload: Record<string, unknown>
}

// Global EventEmitter for server-sent events across the application
const globalEventEmitter = new EventEmitter()
globalEventEmitter.setMaxListeners(200)

const CHANNEL_PREFIX = "team_chat:workspace:"

export function broadcastTeamChatEvent(event: TeamChatEvent) {
  const channelName = `${CHANNEL_PREFIX}${event.workspaceId}`
  globalEventEmitter.emit(channelName, event)
}

export function subscribeToWorkspaceEvents(
  workspaceId: string,
  userId: string,
  onEvent: (event: TeamChatEvent) => void
): () => void {
  const channelName = `${CHANNEL_PREFIX}${workspaceId}`

  const listener = (event: TeamChatEvent) => {
    // If targetUserIds is defined, only emit to users in that list
    if (event.targetUserIds && event.targetUserIds.length > 0) {
      if (!event.targetUserIds.includes(userId)) {
        return
      }
    }
    onEvent(event)
  }

  globalEventEmitter.on(channelName, listener)

  return () => {
    globalEventEmitter.off(channelName, listener)
  }
}
