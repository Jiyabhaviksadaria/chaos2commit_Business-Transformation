import { AIRequestRouter } from "@/lib/ai/request-router"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export interface RequirementAnalysis {
  userRequest: string
  classificationLevel: 0 | 1 | 2
  requiresAi: boolean
  estimatedExecutionTimeMs: number
  impactedComponents: string[]
  recommendedActions: string[]
}

export class RequirementAnalyzer {
  private router: AIRequestRouter

  constructor() {
    this.router = new AIRequestRouter()
  }

  public async analyze(userRequest: string, currentSpec: WebsiteSpecData): Promise<RequirementAnalysis> {
    const route = await this.router.routeRequest(userRequest, currentSpec)

    return {
      userRequest,
      classificationLevel: route.level,
      requiresAi: route.level > 0,
      estimatedExecutionTimeMs: route.level === 0 ? 15 : route.level === 1 ? 800 : 2500,
      impactedComponents: route.changeSet.operations.map(op => op.targetId || op.type),
      recommendedActions: [
        route.summary,
        `Validate ChangeSet against WebsiteSpec schema.`,
        `Preview changes in Visual Editor.`
      ]
    }
  }
}
