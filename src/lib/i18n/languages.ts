/* eslint-disable @typescript-eslint/no-explicit-any */
import en from "@/messages/en.json"
import hi from "@/messages/hi.json"
import gu from "@/messages/gu.json"
import es from "@/messages/es.json"
import fr from "@/messages/fr.json"
import de from "@/messages/de.json"
import ja from "@/messages/ja.json"
import zh from "@/messages/zh.json"

export interface LanguageOption {
  code: string
  name: string
  nativeName: string
  flag: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
]

const dictionaries: Record<string, typeof en> = {
  en: en as any,
  hi: hi as any,
  gu: gu as any,
  es: es as any,
  fr: fr as any,
  de: de as any,
  ja: ja as any,
  zh: zh as any,
}

export function getMessages(locale: string = "en") {
  return dictionaries[locale] || dictionaries["en"] || en
}

export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code)
  return lang ? `${lang.flag} ${lang.name}` : "🇺🇸 English"
}
