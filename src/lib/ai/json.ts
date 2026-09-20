import { ZodType } from "zod"
import { Result, ok, fail } from "@/lib/result"

/**
 * Extracts a balanced JSON object out of a markdown fence or raw text.
 */
export function extractJsonFromText(rawText: string): string {
  let cleaned = rawText.trim()
  
  // Remove markdown fences if present
  if (cleaned.startsWith("```")) {
    const lines = cleaned.split("\n")
    if (lines.length > 1) {
      // Remove first line (e.g. ```json)
      lines.shift()
      // Remove last line if it's ```
      if (lines[lines.length - 1].trim().startsWith("```")) {
        lines.pop()
      }
      cleaned = lines.join("\n").trim()
    }
  }

  // Find the first { and the last }
  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1)
  }

  // Fallback, just return cleaned in case it's an array or boolean (mostly objects expected)
  return cleaned
}

export type AiError = { code: string; message: string }

export function parseAndValidate<T>(text: string, schema: ZodType<T>): Result<T, AiError> {
  try {
    const jsonStr = extractJsonFromText(text)
    const data = JSON.parse(jsonStr)
    const result = schema.safeParse(data)
    
    if (result.success) {
      return ok(result.data)
    } else {
      return fail({ 
        code: "VALIDATION_FAILED", 
        message: formatZodError(result.error) 
      })
    }
  } catch (error) {
    return fail({ 
      code: "PARSE_FAILED", 
      message: error instanceof Error ? error.message : "Invalid JSON syntax" 
    })
  }
}

/**
 * Converts ZodError to a flat string for repair instructions.
 */
export function formatZodError(error: { issues: Array<{ path: unknown[], message: string }> }): string {
  return error.issues
    .map((e) => `Path '${e.path.join(".")}': ${e.message}`)
    .join("; ")
}
