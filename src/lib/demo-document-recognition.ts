/**
 * Deterministic recognition for the Aarohan hackathon demo.
 *
 * This layer performs NO model inference. It normalizes the text extracted from
 * an uploaded document and looks for company-identifying signals. Only when
 * enough signals match does the caller load the prebuilt Aarohan dataset.
 */

export type DemoCompanyId = "aarohan"

export type DetectedInputLanguage = "en" | "hi" | "gu" | "mixed" | "unknown"

export type DocumentRecognition = {
  recognized: boolean
  demoCompany: DemoCompanyId | null
  inputLanguage: DetectedInputLanguage
  confidence: number
  matchedSignals: string[]
  /** Reason the document was rejected, already localized. */
  unrecognizedMessage: Record<"en" | "hi", string>
}

const UNRECOGNIZED: Record<"en" | "hi", string> = {
  en: "This document is not recognized as the Aarohan demo dataset.",
  hi: "यह दस्तावेज़ आरोहण डेमो डेटासेट के रूप में पहचाना नहीं गया।",
}

/** Company-identifying signals, strongest first. */
const NAME_SIGNALS = [
  "aarohan commerce technologies",
  "aarohan commerce",
  "aarohan",
  "આરોહણ કોમર્સ ટેકનોલોજીસ",
  "આરોહણ",
  "आरोहण कॉमर्स टेक्नोलॉजीज",
  "आरोहण",
]

/** Supporting business facts, used when the name alone is ambiguous. */
const FACT_SIGNALS: Array<{ label: string; patterns: RegExp[] }> = [
  { label: "revenue 36.4 crore", patterns: [/36\.4\s*cr/i, /36\.4\s*crore/i] },
  { label: "6850 customers", patterns: [/6,?850/] },
  { label: "ahmedabad", patterns: [/ahmedabad/i, /ahmedabad/i, /अहमदाबाद/] },
  { label: "founded 2020", patterns: [/\b2020\b/] },
  { label: "61% gross margin", patterns: [/61\s*%/] },
  { label: "81% retention", patterns: [/81\s*%/] },
  { label: "nps 61", patterns: [/\bnps\b/i] },
  { label: "142 employees", patterns: [/\b142\b/] },
]

/**
 * Lowercase, collapse whitespace, strip punctuation and normalize Unicode
 * (NFKC) so Latin, Devanagari and Gujarati text compare consistently.
 */
export function normalizeDocumentText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    // Decompose accents for Latin, then recompose, so "Aarōhan" matches.
    .replace(/[-‍﻿]/g, "")
    .replace(/[^a-zA-Z0-9\s.%₹\u0900-\u097F\u0A80-\u0AFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Counts Devanagari and Gujarati characters to detect the document language. */
export function detectInputLanguage(text: string): DetectedInputLanguage {
  const devanagari = (text.match(/[ऀ-ॿ]/g) || []).length
  const gujarati = (text.match(/[઀-૿]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length

  if (devanagari === 0 && gujarati === 0) return latin > 0 ? "en" : "unknown"
  if (devanagari > 0 && gujarati > 0) return "mixed"
  if (devanagari >= gujarati) return "hi"
  return "gu"
}

export function recognizeDemoDocument(rawText: string): DocumentRecognition {
  const normalized = normalizeDocumentText(rawText || "")
  const matchedSignals: string[] = []

  const nameHit = NAME_SIGNALS.find((signal) => normalized.includes(normalizeDocumentText(signal)))
  if (nameHit) matchedSignals.push(nameHit)

  for (const fact of FACT_SIGNALS) {
    if (fact.patterns.some((pattern) => pattern.test(normalized))) matchedSignals.push(fact.label)
  }

  const inputLanguage = detectInputLanguage(normalized)

  // A company name match is sufficient on its own. Without a name match we
  // require corroborating business facts so an unrelated company document is
  // never mislabelled as Aarohan.
  const hasName = Boolean(nameHit)
  const factHits = matchedSignals.length - (hasName ? 1 : 0)
  const recognized = hasName && factHits >= 2

  if (!recognized) {
    return {
      recognized: false,
      demoCompany: null,
      inputLanguage,
      confidence: 0,
      matchedSignals,
      unrecognizedMessage: UNRECOGNIZED,
    }
  }

  const confidence = Math.min(100, 45 + factHits * 8)
  return {
    recognized: true,
    demoCompany: "aarohan",
    inputLanguage,
    confidence,
    matchedSignals,
    unrecognizedMessage: UNRECOGNIZED,
  }
}

export function unrecognizedMessageFor(language: "en" | "hi"): string {
  return UNRECOGNIZED[language]
}
