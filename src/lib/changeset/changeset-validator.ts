/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"

export type ChangeType =
  | "UPDATE_BUSINESS"
  | "UPDATE_CONTENT"
  | "UPDATE_THEME"
  | "UPDATE_NAVIGATION"
  | "TOGGLE_SECTION"
  | "REORDER_SECTIONS"
  | "ADD_SECTION"
  | "DELETE_SECTION"

export interface ChangeOp {
  type: ChangeType
  targetId?: string
  payload: Record<string, any>
}

export interface ChangeSet {
  id: string
  description: string
  message?: string
  operations: ChangeOp[]
  aiGenerated: boolean
}

export const ChangeOpSchema = z.object({
  type: z.enum([
    "UPDATE_BUSINESS",
    "UPDATE_CONTENT",
    "UPDATE_THEME",
    "UPDATE_NAVIGATION",
    "TOGGLE_SECTION",
    "REORDER_SECTIONS",
    "ADD_SECTION",
    "DELETE_SECTION"
  ]),
  targetId: z.string().optional(),
  payload: z.record(z.string(), z.any())
})

export const ChangeSetSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  message: z.string().optional(),
  operations: z.array(ChangeOpSchema),
  aiGenerated: z.boolean().default(false)
})

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  affectedPaths: string[]
}

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

export class ChangeSetValidator {
  /**
   * Validates a ChangeSet against current WebsiteSpec state.
   */
  public static validate(changeSet: ChangeSet, currentSpec: WebsiteSpecData): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const affectedPaths: string[] = []

    const parse = ChangeSetSchema.safeParse(changeSet)
    if (!parse.success) {
      return {
        valid: false,
        errors: parse.error.issues.map(i => `${i.path.join(".")}: ${i.message}`),
        warnings: [],
        affectedPaths: []
      }
    }

    const existingSectionIds = new Set(currentSpec.sections.map(s => s.id))

    changeSet.operations.forEach((op, index) => {
      const prefix = `Op #${index + 1} (${op.type})`

      switch (op.type) {
        case "UPDATE_BUSINESS":
          affectedPaths.push("siteName", "sections.contact")
          if (op.payload.name && typeof op.payload.name !== "string") {
            errors.push(`${prefix}: Business name must be a string.`)
          }
          break

        case "UPDATE_THEME":
          affectedPaths.push("theme")
          if (op.payload.primary && !HEX_COLOR_REGEX.test(op.payload.primary)) {
            errors.push(`${prefix}: Primary color "${op.payload.primary}" must be a valid hex color code (e.g. #0D9488).`)
          }
          if (op.payload.secondaryColor && !HEX_COLOR_REGEX.test(op.payload.secondaryColor)) {
            warnings.push(`${prefix}: Secondary color "${op.payload.secondaryColor}" may not render cleanly.`)
          }
          break

        case "UPDATE_NAVIGATION":
          affectedPaths.push("nav")
          if (!Array.isArray(op.payload.items)) {
            errors.push(`${prefix}: Navigation items payload must be an array of strings.`)
          }
          break

        case "TOGGLE_SECTION":
        case "UPDATE_CONTENT":
        case "DELETE_SECTION":
          if (!op.targetId) {
            errors.push(`${prefix}: Target section ID is required.`)
          } else if (!existingSectionIds.has(op.targetId)) {
            errors.push(`${prefix}: Section with ID "${op.targetId}" does not exist in current website.`)
          } else {
            affectedPaths.push(`sections.${op.targetId}`)
          }
          break

        case "ADD_SECTION":
          if (!op.payload.id || !op.payload.type) {
            errors.push(`${prefix}: New section payload must include both "id" and "type".`)
          } else if (existingSectionIds.has(op.payload.id)) {
            errors.push(`${prefix}: Section with ID "${op.payload.id}" already exists.`)
          } else {
            affectedPaths.push(`sections.${op.payload.id}`)
          }
          break

        case "REORDER_SECTIONS":
          affectedPaths.push("sections.order")
          if (!Array.isArray(op.payload.order)) {
            errors.push(`${prefix}: Order payload must be an array of section IDs.`)
          }
          break
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      affectedPaths: Array.from(new Set(affectedPaths))
    }
  }
}
