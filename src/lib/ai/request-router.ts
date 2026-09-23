/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeSet, ChangeSetSchema } from "@/lib/changeset/changeset-validator"
import { LLMRouter } from "@/lib/ai/llm-provider"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export type RoutingLevel = 0 | 1 | 2

export interface RouteResult {
  level: RoutingLevel
  reason: string
  llmCallsMade: number
  changeSet: ChangeSet
  summary: string
}

export class AIRequestRouter {
  private llmRouter: LLMRouter

  constructor() {
    this.llmRouter = new LLMRouter()
  }

  /**
   * Route user request and produce a ChangeSet.
   * Level 0 bypasses LLM completely!
   */
  public async routeRequest(userRequest: string, currentSpec: WebsiteSpecData): Promise<RouteResult> {
    const req = userRequest.trim()

    // 1. Level 0 Check: Deterministic Config Updates (0 LLM Calls!)
    const level0Match = this.tryLevel0Deterministic(req, currentSpec)
    if (level0Match) {
      return {
        level: 0,
        reason: "Request matched deterministic configuration pattern. Applied directly without LLM API call.",
        llmCallsMade: 0,
        changeSet: level0Match.changeSet,
        summary: level0Match.summary
      }
    }

    // 2. Level 2 Check: Complex Architecture / Full Build
    const isComplex = /(build full|add auth|custom backend|integrate stripe|patient database|ai chatbot|complex workflow)/i.test(req)
    const targetLevel: RoutingLevel = isComplex ? 2 : 1

    // 3. Call LLM for Level 1 or Level 2 requirement synthesis
    const systemPrompt = `You are a Senior Full-Stack Architect and AI Product Builder.
Analyze the user request for a website customization and output a structured ChangeSet.
Change types allowed: UPDATE_BUSINESS, UPDATE_CONTENT, UPDATE_THEME, UPDATE_NAVIGATION, TOGGLE_SECTION, REORDER_SECTIONS, ADD_SECTION, DELETE_SECTION.
Current website sections available: ${currentSpec.sections.map(s => s.id).join(", ")}.`

    const prompt = `Current Website: ${currentSpec.siteName}
User Customization Request: "${req}"
Routing Level: Level ${targetLevel} (${isComplex ? "Complex Build" : "Standard Interpretation"})
Generate a valid ChangeSet JSON object matching the schema.`

    try {
      const { data: changeSet } = await this.llmRouter.generate(prompt, ChangeSetSchema, systemPrompt)
      return {
        level: targetLevel,
        reason: isComplex ? "Complex custom application feature required." : "Requirement interpretation and copy synthesis required.",
        llmCallsMade: 1,
        changeSet,
        summary: `Level ${targetLevel} customization generated successfully.`
      }
    } catch (err: any) {
      console.warn("LLM router failed, generating fallback ChangeSet:", err)
      return {
        level: targetLevel,
        reason: "Fallback handler triggered due to LLM response timeout.",
        llmCallsMade: 1,
        changeSet: {
          id: `cs-fallback-${Date.now()}`,
          description: `Customization for: ${req}`,
          aiGenerated: true,
          operations: [
            {
              type: "UPDATE_CONTENT",
              targetId: "hero",
              payload: { subheadline: req }
            }
          ]
        },
        summary: "Fallback customization changeset applied."
      }
    }
  }

  /**
   * Level 0 Deterministic Pattern Matcher (0 LLM Calls)
   */
  private tryLevel0Deterministic(req: string, currentSpec: WebsiteSpecData): { changeSet: ChangeSet; summary: string } | null {
    // Pattern: Change name to X / rename to X
    const nameMatch = req.match(/(?:change|rename|set)\s+(?:the\s+)?(?:business\s+)?name\s+to\s+["']?([^"']+)["']?/i)
    if (nameMatch) {
      const newName = nameMatch[1].trim()
      return {
        summary: `Renamed business to "${newName}" deterministically.`,
        changeSet: {
          id: `cs-det-name-${Date.now()}`,
          description: `Set business name to ${newName}`,
          aiGenerated: false,
          operations: [
            {
              type: "UPDATE_BUSINESS",
              payload: { name: newName }
            }
          ]
        }
      }
    }

    // Pattern: Change color / primary color to #HEX or name
    const colorMatch = req.match(/(?:change|set)\s+(?:the\s+)?(?:theme\s+)?color\s+to\s+([#a-zA-Z0-9]+)/i)
    if (colorMatch) {
      let color = colorMatch[1].trim()
      if (!color.startsWith("#")) {
        const colorMap: Record<string, string> = {
          green: "#10B981",
          teal: "#0D9488",
          blue: "#2563EB",
          navy: "#1E3A8A",
          pink: "#BE185D",
          red: "#991B1B",
          purple: "#6366F1",
          dark: "#0F172A"
        }
        color = colorMap[color.toLowerCase()] || "#2563EB"
      }
      return {
        summary: `Updated primary theme color to "${color}" deterministically.`,
        changeSet: {
          id: `cs-det-color-${Date.now()}`,
          description: `Update primary theme color to ${color}`,
          aiGenerated: false,
          operations: [
            {
              type: "UPDATE_THEME",
              payload: { primary: color }
            }
          ]
        }
      }
    }

    // Pattern: Hide section X / remove section X / toggle section X
    const hideMatch = req.match(/(?:hide|remove|disable)\s+(?:the\s+)?([a-zA-Z0-9_]+)(?:\s+section)?/i)
    if (hideMatch) {
      const sectionName = hideMatch[1].toLowerCase()
      const targetSection = currentSpec.sections.find(s => s.id === sectionName || s.type === sectionName)
      if (targetSection) {
        return {
          summary: `Disabled section "${targetSection.id}" deterministically.`,
          changeSet: {
            id: `cs-det-hide-${Date.now()}`,
            description: `Hide section ${targetSection.id}`,
            aiGenerated: false,
            operations: [
              {
                type: "TOGGLE_SECTION",
                targetId: targetSection.id,
                payload: { visible: false }
              }
            ]
          }
        }
      }
    }

    return null
  }
}
