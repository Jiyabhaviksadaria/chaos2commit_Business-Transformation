import { ZodType } from "zod"
import { DeliverableType } from "@prisma/client"

export type DeliverableConfig<T = unknown> = {
  type: DeliverableType
  i18nTitleKey: string
  dependsOn: DeliverableType[]
  systemPrompt: string
  buildUserPrompt: (ctx: string, extraInstructions?: string) => string
  outputSchema: ZodType<T>
  mockFixture: T
}

// Registry map
export const deliverableRegistry = new Map<DeliverableType, DeliverableConfig<unknown>>()

export function registerDeliverable<T>(config: DeliverableConfig<T>) {
  deliverableRegistry.set(config.type, config)
}

export function getDeliverableConfig(type: DeliverableType): DeliverableConfig<unknown> | undefined {
  return deliverableRegistry.get(type)
}
