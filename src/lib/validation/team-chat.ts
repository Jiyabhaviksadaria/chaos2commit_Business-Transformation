import { z } from "zod"

export const createChannelSchema = z.object({
  type: z.literal("CHANNEL").default("CHANNEL"),
  name: z
    .string()
    .min(1, "Channel name is required")
    .max(80, "Channel name cannot exceed 80 characters")
    .regex(/^[a-z0-9_-]+$/, "Channel name must be lowercase letters, numbers, hyphens, or underscores"),
  description: z.string().max(280, "Description cannot exceed 280 characters").optional(),
  isPrivate: z.boolean().default(false),
  projectId: z.string().min(1).max(128).optional(),
})

export const createDirectMessageSchema = z.object({
  type: z.literal("DIRECT_MESSAGE"),
  recipientUserId: z.string().min(1, "Recipient user ID is required"),
})

export const createGroupSchema = z.object({
  type: z.literal("GROUP"),
  name: z.string().max(100, "Group name cannot exceed 100 characters").optional(),
  memberUserIds: z.array(z.string().min(1)).min(1, "At least one member is required"),
})

export const createConversationSchema = z.discriminatedUnion("type", [
  createChannelSchema,
  createDirectMessageSchema,
  createGroupSchema,
])

export const createMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(10000, "Message content cannot exceed 10,000 characters")
    .refine((val) => val.trim().length > 0, "Message cannot be only whitespace"),
})

export const editMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(10000, "Message content cannot exceed 10,000 characters")
    .refine((val) => val.trim().length > 0, "Message cannot be only whitespace"),
})

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
})
