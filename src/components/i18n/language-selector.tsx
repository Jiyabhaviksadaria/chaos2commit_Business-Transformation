"use client"

import React, { useState } from "react"
import { SUPPORTED_LANGUAGES, LanguageOption } from "@/lib/i18n/languages"
import { Globe, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LanguageSelectorProps {
  projectId?: string
  currentLanguage?: string
  onLanguageChange?: (code: string) => void
}

export function LanguageSelector({ projectId, currentLanguage = "en", onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [selected, setSelected] = useState<string>(currentLanguage)
  const [saving, setSaving] = useState<boolean>(false)

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.code === selected) || SUPPORTED_LANGUAGES[0]

  const handleSelect = async (lang: LanguageOption) => {
    setSelected(lang.code)
    setIsOpen(false)

    if (onLanguageChange) {
      onLanguageChange(lang.code)
    }

    if (projectId) {
      try {
        setSaving(true)
        const res = await fetch(`/api/projects/${projectId}/language`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: lang.code })
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(`Language updated to ${lang.nativeName} (${lang.name})`)
        } else {
          toast.error(data.error || "Failed to update project language")
        }
      } catch (error) {
        console.error("Language selector error:", error)
        toast.error("Network error updating language")
      } finally {
        setSaving(false)
      }
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={saving}
        className="flex items-center gap-1.5 bg-white border border-[#E5DFD4] hover:bg-neutral-50 text-neutral-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-all"
      >
        <Globe className="w-3.5 h-3.5 text-neutral-600" />
        <span>{activeLang.flag} {activeLang.nativeName}</span>
        {saving && <Loader2 className="w-3 h-3 animate-spin text-neutral-400 ml-1" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#E5DFD4] shadow-lg z-50 py-2 divide-y divide-[#F0EBE1]">
          <div className="px-3 py-1 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
            Select Language
          </div>
          <div className="py-1">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang)}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-[#FAF8F2] flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.nativeName} ({lang.name})</span>
                </span>
                {selected === lang.code && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
