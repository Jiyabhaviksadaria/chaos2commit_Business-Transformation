import { OrgPlan } from "@prisma/client"

export const PLAN_LIMITS = {
  [OrgPlan.FREE]: { credits: 30, maxWorkableSystems: 2 },
  [OrgPlan.PRO]: { credits: 500, maxWorkableSystems: 8 },
  [OrgPlan.ENTERPRISE]: { credits: 5000, maxWorkableSystems: Infinity }
} as const

export const CREDIT_COSTS = {
  INTAKE_ANALYSIS: 1,
  BUILD_SYSTEMS: 5,
  MODIFY_REGENERATE: 2,
  CONSULTING_MODULE: 1,
  CHAT_MESSAGE: 0, // 0.25 rounded: charge per 4 messages = 1 credit (tracked separately)
  EXPORT: 0
} as const

export type CreditAction = keyof typeof CREDIT_COSTS
