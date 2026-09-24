export * from "./registry-store"

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
import { initSolutionRecommendationModule } from "./deliverables/solution-recommendations"
import { initApiDesignModule } from "./deliverables/api-design"

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
initSolutionRecommendationModule()
initApiDesignModule()
