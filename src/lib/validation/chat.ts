import { z } from "zod"

export const MAX_CHAT_TITLE_LENGTH = 120
export const MAX_CHAT_MESSAGE_LENGTH = 20_000

export const chatSessionIdSchema = z
  .string()
  .trim()
  .min(1, "A valid chat session id is required")
  .max(128, "Invalid chat session id")

export const createChatSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Chat title cannot be empty")
      .max(MAX_CHAT_TITLE_LENGTH, "Chat title is too long")
      .default("New chat"),
  })
  .strict()

export const renameChatSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Chat title cannot be empty")
      .max(MAX_CHAT_TITLE_LENGTH, "Chat title is too long"),
  })
  .strict()

export const chatMessageSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Message content cannot be empty")
      .max(MAX_CHAT_MESSAGE_LENGTH, "Message content is too long"),
    retryMessageId: z
      .string()
      .trim()
      .min(1, "A valid retry message id is required")
      .max(128, "Invalid retry message id")
      .optional(),
  })
  .strict()
