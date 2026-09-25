export type AssistantLanguage = "en" | "hi" | "gu" | "mixed"

const DEVANAGARI = /[\u0900-\u097f]/
const GUJARATI = /[\u0a80-\u0aff]/

/** Detect the conversation language without relying on browser locale. */
export function detectInstructionLanguage(input: string): AssistantLanguage {
  const text = input.trim()
  if (!text) return "en"
  const hasHindiScript = DEVANAGARI.test(text)
  const hasGujaratiScript = GUJARATI.test(text)
  if (hasHindiScript && hasGujaratiScript) return "mixed"
  if (hasGujaratiScript) return "gu"
  if (hasHindiScript) return "hi"

  const lower = text.toLowerCase()
  const hindiRoman = /\b(ka|ko|kar|karo|kar\s+do|bana|bana\s+do|bada|badha|thoda)\b/i.test(lower)
  const gujaratiRoman = /\b(nu|ne|kari|banavo|banao|thodu|moderne)\b/i.test(lower)
  if (hindiRoman && gujaratiRoman) return "mixed"
  if (gujaratiRoman) return "gu"
  if (hindiRoman) return "hi"
  return "en"
}

export function getAssistantLanguage(input: string, selectedLanguage: "en" | "hi" | "gu"): Exclude<AssistantLanguage, "mixed"> {
  const detected = detectInstructionLanguage(input)
  return detected === "mixed" ? selectedLanguage : detected
}

export function assistantConfirmation(language: Exclude<AssistantLanguage, "mixed">): string {
  if (language === "hi") return "अनुरोधित डिज़ाइन परिवर्तन लागू कर दिए गए हैं।"
  if (language === "gu") return "વિનંતી કરેલા ડિઝાઇન ફેરફાર લાગુ કરી દીધા."
  return "Applied the requested design changes."
}

export function assistantClarification(language: Exclude<AssistantLanguage, "mixed">): string {
  if (language === "hi") return "मुझे यह निर्देश पूरी तरह समझ नहीं आया। कृपया बताएं कि आप किस section या design element को बदलना चाहते हैं।"
  if (language === "gu") return "મને આ સૂચના સંપૂર્ણ રીતે સમજાઈ નથી. કૃપા કરીને જણાવો કે તમે કયા section અથવા design element માં ફેરફાર કરવા માંગો છો."
  return "I could not fully understand that instruction. Please specify which section or design element you want to change."
}
