export const DEFAULT_CHAT_TITLE = "New chat"
export const MAX_GENERATED_CHAT_TITLE_LENGTH = 80

const GENERIC_TITLES = new Set(["hello", "hey", "hi", "test", "help", "new chat"])
const FILLER_WORDS = new Set([
  "a",
  "about",
  "an",
  "the",
  "and",
  "are",
  "bottlenecks",
  "can",
  "could",
  "create",
  "do",
  "draft",
  "for",
  "from",
  "generate",
  "give",
  "help",
  "how",
  "i",
  "in",
  "is",
  "me",
  "my",
  "of",
  "on",
  "our",
  "please",
  "process",
  "to",
  "what",
  "with",
  "you",
  // Common conversational fillers in the languages supported by the copilot.
  "because",
  "has",
  "have",
  "keep",
  "keeps",
  "kya",
  "hai",
  "hain",
  "che",
  "shu",
  "su",
  "aa",
  "nu",
  "ni",
  "ne",
  "hase",
  "samajhati",
  "nathi",
  "mane",
  "meri",
  "aur",
  "same",
  "nahi",
  "hota",
  "isko",
  "mein",
  "mate",
  "samjhao",
  "samjavo",
  "samajhao",
  "samajhavi",
  "ma",
  "mā",
  "में",
  "लिए",
  "है",
  "हैं",
  "क्या",
  "और",
  "का",
  "की",
  "को",
  "से",
  "पर",
  "છે",
  "શું",
  "અને",
  "માટે",
  "ના",
  "ની",
  "નું",
  "થી",
  "માં",
  "પર",
])
const LEADING_COMMAND = /^(?:please\s+)?(?:can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+|help\s+me\s+)?(?:analy[sz]e|build|create|draft|explain|generate|give|help|suggest|write)\s+/i
const TRAILING_GENERIC_WORDS = new Set(["bottlenecks", "process", "system", "workflow"])

function redactSensitiveText(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "")
    .replace(/\b(?:https?:\/\/|www\.)[^\s]+/gi, "")
    .replace(/\b(?:password|passcode|secret|token|api[_ -]?key|access[_ -]?token)\s*(?:is|are|was|were|[:=])\s*[^\s,;]+/gi, "")
    .replace(/\b(?:gsk|sk|pk|rk)[_-][A-Z0-9_-]{8,}\b/gi, "")
    .replace(/\bAIza[0-9A-Z_-]{20,}\b/gi, "")
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "")
}

function capitalizeWord(word: string): string {
  // Preserve intentional acronyms and product spellings such as CRM, KPI,
  // OpenAPI, and POS instead of lowercasing every character after the first.
  if (/^[A-Z0-9]{2,}$/.test(word) || (word !== word.toLowerCase() && word !== word.toUpperCase())) return word
  return word
    .split("-")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : part))
    .join("-")
}

/**
 * Creates a short, deterministic title from the first user message.
 * It intentionally performs no AI request and keeps only a small summary-like
 * prefix so raw conversation content is not copied into the sidebar metadata.
 */
export function generateChatTitle(content: string): string {
  const normalized = redactSensitiveText(content.replace(/\s+/g, " ").trim())
  if (!normalized || GENERIC_TITLES.has(normalized.toLowerCase())) {
    return DEFAULT_CHAT_TITLE
  }

  const withoutCommand = normalized.replace(LEADING_COMMAND, "")
  // Unicode-aware tokenization keeps Hindi/Gujarati titles useful while still
  // discarding punctuation and accidental secret-like fragments.
  const words = withoutCommand.match(new RegExp("[\\p{L}\\p{M}\\p{N}]+(?:[’'][\\p{L}\\p{M}\\p{N}]+)*", "gu")) ?? []

  const meaningfulWords = words.filter((word) => !FILLER_WORDS.has(word.toLocaleLowerCase()))
  if (meaningfulWords.length === 0) return DEFAULT_CHAT_TITLE

  const selectedWords = meaningfulWords.slice(0, 6)

  while (selectedWords.length > 1 && TRAILING_GENERIC_WORDS.has(selectedWords[selectedWords.length - 1].toLowerCase())) {
    selectedWords.pop()
  }

  const title = selectedWords.map(capitalizeWord).join(" ").trim()
  if (!title) return DEFAULT_CHAT_TITLE

  if (title.length <= MAX_GENERATED_CHAT_TITLE_LENGTH) return title

  const truncated = title.slice(0, MAX_GENERATED_CHAT_TITLE_LENGTH - 1)
  const lastSpace = truncated.lastIndexOf(" ")
  const base = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
  return `${base.trim()}…`
}
