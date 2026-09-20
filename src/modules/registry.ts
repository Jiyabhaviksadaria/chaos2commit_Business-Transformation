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

// Initialize core modules
import { initRequirementsModule } from "./deliverables/requirements"
import { initIntakeAnalysisModule } from "./deliverables/intake-analysis"
import { initSystemSpecModule } from "./deliverables/system-spec"
import { initWebsiteSpecModule } from "./deliverables/website-spec"
import { initSolutionArchitectureModule } from "./deliverables/solution-architecture"
import { initTransformationRoadmapModule } from "./deliverables/transformation-roadmap"
import { initProcessIntelligenceModule } from "./deliverables/process-intelligence"
import { initUxDesignModule } from "./deliverables/ux-design"
import { initDatabaseApiDesignModule } from "./deliverables/database-api-design"
import { initEffortEstimationModule } from "./deliverables/effort-estimation"
import { initGapAnalysisModule } from "./deliverables/gap-analysis"

initRequirementsModule()
initIntakeAnalysisModule()
initSystemSpecModule()
initWebsiteSpecModule()
initSolutionArchitectureModule()
initTransformationRoadmapModule()
initProcessIntelligenceModule()
initUxDesignModule()
initDatabaseApiDesignModule()
initEffortEstimationModule()
initGapAnalysisModule()
