"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import editorEnglishMessages from "@/messages/en.json"
import { SiteRenderer } from "@/components/website/site-renderer"
import { WebsiteLanguageSwitcher } from "@/components/website/website-language-switcher"
import { getSupportedWebsiteLocales, getWebsiteLocaleStatus, resolveWebsiteLocale, applyWebsiteLanguageConfig, syncPrimaryWebsiteContent } from "@/lib/website/localized-spec"
import { getProjectLanguageConfig } from "@/lib/i18n/website-languages"
import { ENABLED_LOCALES, LOCALE_CONFIG, type AppLocale } from "@/i18n/locales"
import { ConfigStore } from "@/lib/config-engine/config-store"
import type { ChangeSet } from "@/lib/changeset/changeset-validator"
import { ChangeSetValidator } from "@/lib/changeset/changeset-validator"
import type { WebsiteSpecData } from "@/modules/deliverables/website-spec"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Save,
  Undo,
  Redo,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Check,
  Play,
  Rocket,
  Layers,
  Palette,
  Sliders,
  Type,
  ArrowLeft,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  X
} from "lucide-react"
import { toast } from "sonner"

export default function VisualEditorPage() {
  const params = useParams()
  const router = useRouter()
  const translator = useTranslations("WebsiteBuilder")
  const t = (key: string, values?: Record<string, string>) => {
    const fallback = (editorEnglishMessages.WebsiteBuilder as Record<string, string>)[key] || key
    const interpolate = (message: string) => Object.entries(values || {}).reduce((result, [name, value]) => result.replace(`{${name}}`, value), message)
    if (!translator.has(key as any)) return interpolate(fallback)
    try {
      return translator(key as any, values as any) as string
    } catch {
      return interpolate(fallback)
    }
  }
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [spec, setSpec] = useState<WebsiteSpecData | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState<AppLocale>("en")
  const [languageSettingsOpen, setLanguageSettingsOpen] = useState(false)
  const [languageDraftPrimary, setLanguageDraftPrimary] = useState<AppLocale>("en")
  const [languageDraftSupported, setLanguageDraftSupported] = useState<AppLocale[]>(["en"])
  const [languageSettingsSaving, setLanguageSettingsSaving] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>("hero")
  const [configStore, setConfigStore] = useState<ConfigStore | null>(null)

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [translatingLocale, setTranslatingLocale] = useState<AppLocale | null>(null)
  const [generatedLocale, setGeneratedLocale] = useState<AppLocale | null>(null)
  const [lastRouteResult, setLastRouteResult] = useState<any>(null)
  // Persistent assistant feedback so an applied change stays visible in the
  // panel instead of only flashing as a transient toast.
  const [assistantFeedback, setAssistantFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)

  // Versioning & History
  const [history, setHistory] = useState<WebsiteSpecData[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [versionNumber, setVersionNumber] = useState(1)

  // Deploy Preview state
  const [deployingPreview, setDeployingPreview] = useState(false)

  // Publish & Get Link state
  const [publishing, setPublishing] = useState(false)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
  const [publishedLocalizedUrls, setPublishedLocalizedUrls] = useState<Record<string, string>>({})
  const [showPublishModal, setShowPublishModal] = useState(false)

  // Load project website spec
  useEffect(() => {
    async function loadProjectSpec() {
      setLoading(true)
      try {
        const res = await fetch(`/api/projects/${projectId}`)
        const data = await res.json()

        let initialSpec: WebsiteSpecData
        // The project endpoint returns the language-configured snapshot. Prefer
        // it over the raw deliverable version so a language preference change
        // is reflected immediately in the editor.
        if (data.spec) {
          initialSpec = data.spec
        } else if (data.deliverables && data.deliverables.length > 0) {
          const webDel = data.deliverables.find((d: any) => d.type === "WEBSITE_SPEC")
          initialSpec = webDel?.versions?.[0]?.content || data.websiteSpec
        } else {
          initialSpec = data.websiteSpec
        }

        if (!initialSpec) {
          // Fallback to clinic template baseline
          const { buildWebsiteSpecFromTemplate } = await import("@/lib/templates/template-registry")
          initialSpec = buildWebsiteSpecFromTemplate("clinic", data.name || "My Business")
        }

        const configuredSpec = applyWebsiteLanguageConfig(initialSpec, getProjectLanguageConfig(initialSpec))
        const store = new ConfigStore(projectId, data.templateId || "clinic", configuredSpec)
        setConfigStore(store)
        const languageConfig = getProjectLanguageConfig(initialSpec)
        setSelectedLanguage(languageConfig.primaryLanguage)
        setLanguageDraftPrimary(languageConfig.primaryLanguage)
        setLanguageDraftSupported(languageConfig.supportedLanguages)
        setSpec(store.getWebsiteSpec())
        setHistory([store.getWebsiteSpec()])
        setHistoryIdx(0)
      } catch (err) {
        console.warn("Failed to load project spec from API, building fallback clinic spec:", err)
        const { buildWebsiteSpecFromTemplate } = await import("@/lib/templates/template-registry")
        const fallbackSpec = buildWebsiteSpecFromTemplate("clinic", "Clinic Practice")
        const configuredSpec = applyWebsiteLanguageConfig(fallbackSpec, getProjectLanguageConfig(fallbackSpec))
        const store = new ConfigStore(projectId, "clinic", configuredSpec)
        setConfigStore(store)
        const languageConfig = getProjectLanguageConfig(fallbackSpec)
        setSelectedLanguage(languageConfig.primaryLanguage)
        setLanguageDraftPrimary(languageConfig.primaryLanguage)
        setLanguageDraftSupported(languageConfig.supportedLanguages)
        setSpec(configuredSpec)
        setHistory([configuredSpec])
        setHistoryIdx(0)
      } finally {
        setLoading(false)
      }
    }
    loadProjectSpec()
  }, [projectId])

  const pushState = (newSpec: WebsiteSpecData) => {
    const updated = JSON.parse(JSON.stringify(newSpec))
    configStore?.replaceWebsiteSpec(updated)
    const synchronized = configStore?.getWebsiteSpec() || updated
    setSpec(synchronized)
    const newHist = history.slice(0, historyIdx + 1)
    newHist.push(synchronized)
    setHistory(newHist)
    setHistoryIdx(newHist.length - 1)
  }

  const activeSpec = useMemo(() => spec ? resolveWebsiteLocale(spec, selectedLanguage) : null, [spec, selectedLanguage])
  const supportedWebsiteLocales = useMemo(() => spec ? getSupportedWebsiteLocales(spec) : [], [spec])
  const selectedLocaleReady = spec ? getWebsiteLocaleStatus(spec, selectedLanguage) === "ready" : false

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prev = history[historyIdx - 1]
      setHistoryIdx(historyIdx - 1)
      const restored = JSON.parse(JSON.stringify(prev))
      configStore?.replaceWebsiteSpec(restored)
      setSpec(configStore?.getWebsiteSpec() || restored)
      toast.info("Undo applied")
    }
  }

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const next = history[historyIdx + 1]
      setHistoryIdx(historyIdx + 1)
      const restored = JSON.parse(JSON.stringify(next))
      configStore?.replaceWebsiteSpec(restored)
      setSpec(configStore?.getWebsiteSpec() || restored)
      toast.info("Redo applied")
    }
  }

  // Visual Editor Updates
  const handleUpdateBusinessName = (name: string) => {
    if (!configStore || !spec) return
    const config = getProjectLanguageConfig(spec)
    if (selectedLanguage === config.primaryLanguage) {
      pushState(configStore.updateBusiness({ name }))
      return
    }
    const current = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
    const localized = JSON.parse(JSON.stringify(resolveWebsiteLocale(current, selectedLanguage))) as WebsiteSpecData
    localized.siteName = name
    current.localizedContent = {
      ...(current.localizedContent || {}),
      [selectedLanguage]: {
        ...(current.localizedContent?.[selectedLanguage] || {}),
        siteName: name,
        nav: localized.nav,
        sections: localized.sections,
        seo: localized.seo,
        ui: localized.ui,
      },
    }
    current.translationStatus = { ...(current.translationStatus || {}), [selectedLanguage]: "ready" }
    pushState(applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(current), config))
  }

  const handleUpdatePrimaryColor = (color: string) => {
    if (!spec) return
    const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
    updated.theme = { ...updated.theme, primary: color }
    pushState(updated)
  }

  const handleToggleSectionVisibility = (secId: string) => {
    if (!configStore || !spec) return
    const updated = configStore.toggleSection(secId)
    pushState(updated)
  }

  const handleMoveSection = (secId: string, direction: "up" | "down") => {
    if (!configStore || !spec) return
    const ids = spec.sections.map(s => s.id).filter((id): id is string => Boolean(id))
    const idx = ids.indexOf(secId)
    if (idx === -1) return
    if (direction === "up" && idx > 0) {
      const tmp = ids[idx]
      ids[idx] = ids[idx - 1]
      ids[idx - 1] = tmp
    } else if (direction === "down" && idx < ids.length - 1) {
      const tmp = ids[idx]
      ids[idx] = ids[idx + 1]
      ids[idx + 1] = tmp
    }
    const updated = configStore.reorderSections(ids)
    pushState(updated)
  }

  const handleUpdateSectionContent = (secId: string, key: string, val: any) => {
    if (!spec) return
    const current = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
    const config = getProjectLanguageConfig(current)
    const localized = JSON.parse(JSON.stringify(resolveWebsiteLocale(current, selectedLanguage))) as WebsiteSpecData
    const sections = [...(localized.sections || [])]
    const index = sections.findIndex((section) => section.id === secId)
    if (index < 0) return
    sections[index] = { ...sections[index], [key]: val }

    if (selectedLanguage === config.primaryLanguage) {
      // The top-level spec is the canonical primary-language content.
      current.sections = sections
    } else {
      current.localizedContent = {
        ...(current.localizedContent || {}),
        [selectedLanguage]: {
          ...(current.localizedContent?.[selectedLanguage] || {}),
          sections,
        },
      }
    }
    current.translationStatus = { ...(current.translationStatus || {}), [selectedLanguage]: "ready" }
    pushState(applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(current), config))
  }

  // Returns the number of operations actually applied so the caller can confirm
  // a real change instead of reporting a silent no-op.
  const applyAssistantChangeSet = (changeSet: ChangeSet, sourceSpec: WebsiteSpecData): number => {
    if (!configStore) return 0
    const config = getProjectLanguageConfig(spec || sourceSpec)
    const isPrimary = selectedLanguage === config.primaryLanguage
    const targetStore = isPrimary ? configStore : new ConfigStore(projectId, "clinic", sourceSpec)
    const applyOperation = (store: ConfigStore, operation: ChangeSet["operations"][number]) => {
      switch (operation.type) {
        case "UPDATE_BUSINESS":
          store.updateBusiness(operation.payload)
          break
        case "UPDATE_THEME": {
          const themePayload = {
            ...operation.payload,
            ...(operation.payload.primaryColor && !operation.payload.primary ? { primary: operation.payload.primaryColor } : {}),
            ...(operation.payload.fontFamily && !operation.payload.font ? { font: operation.payload.fontFamily } : {}),
          }
          store.updateTheme(themePayload)
          break
        }
        case "UPDATE_NAVIGATION":
          if (Array.isArray(operation.payload.items)) store.updateNavigation(operation.payload.items)
          break
        case "TOGGLE_SECTION":
          if (operation.targetId) store.toggleSection(operation.targetId, operation.payload.visible)
          break
        case "UPDATE_CONTENT":
          if (operation.targetId) store.updateSectionContent(operation.targetId, operation.payload)
          break
        case "REORDER_SECTIONS": {
          const ids = Array.isArray(operation.payload.sectionIds) ? operation.payload.sectionIds : operation.payload.order
          if (Array.isArray(ids) && ids.every((id): id is string => typeof id === "string")) store.reorderSections(ids)
          break
        }
        case "DELETE_SECTION": {
          if (!operation.targetId) break
          const current = JSON.parse(JSON.stringify(store.getWebsiteSpec())) as WebsiteSpecData
          const sections = current.sections.filter((section) => section.id !== operation.targetId)
          if (sections.length !== current.sections.length) store.replaceWebsiteSpec({ ...current, sections })
          break
        }
        case "ADD_SECTION": {
          const section = operation.payload.section || (operation.payload.id && operation.payload.type ? operation.payload : null)
          if (!section || typeof section !== "object") break
          const current = JSON.parse(JSON.stringify(store.getWebsiteSpec())) as WebsiteSpecData
          store.replaceWebsiteSpec({ ...current, sections: [...current.sections, section as WebsiteSpecData["sections"][number]] })
          break
        }
      }
    }

    if (isPrimary) {
      changeSet.operations.forEach((operation) => applyOperation(configStore, operation))
      pushState(configStore.getWebsiteSpec())
      return changeSet.operations.length
    }

    changeSet.operations.forEach((operation) => {
      if (operation.type === "UPDATE_THEME" || operation.type === "TOGGLE_SECTION" || operation.type === "REORDER_SECTIONS" || operation.type === "DELETE_SECTION" || operation.type === "ADD_SECTION") {
        applyOperation(configStore, operation)
      }
      applyOperation(targetStore, operation)
    })
    const localizedResult = targetStore.getWebsiteSpec()
    const next = JSON.parse(JSON.stringify(configStore.getWebsiteSpec())) as WebsiteSpecData
    next.localizedContent = {
      ...(next.localizedContent || {}),
      [selectedLanguage]: {
        ...(next.localizedContent?.[selectedLanguage] || {}),
        siteName: localizedResult.siteName,
        nav: localizedResult.nav,
        sections: localizedResult.sections,
        seo: localizedResult.seo,
        ui: localizedResult.ui,
      },
    }
    next.translationStatus = { ...(next.translationStatus || {}), [selectedLanguage]: "ready" }
    pushState(applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(next), config))
    return changeSet.operations.length
  }

  const handleRunAiRequest = async () => {
    if (!aiPrompt.trim() || !spec || !configStore) return
    if (!selectedLocaleReady) {
      const message = t("missingLanguage", { language: LOCALE_CONFIG[selectedLanguage].nativeName })
      setAssistantFeedback({ tone: "error", message })
      toast.error(message)
      return
    }
    setAiLoading(true)
    setAssistantFeedback(null)
    try {
      const sourceSpec = activeSpec || spec
      const response = await fetch(`/api/projects/${projectId}/website/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          spec: sourceSpec,
          selectedLanguage,
          currentSection: selectedSectionId,
          projectName: spec.siteName,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok || !data.changeSet) {
        console.error("AI Design Assistant request failed", { projectId, status: response.status, error: data.error })
        const message = response.status === 422 ? data.error || t("assistantInvalid") : response.status === 429 ? t("rateLimited") : t("assistantUnavailable")
        setAssistantFeedback({ tone: "error", message })
        toast.error(message)
        return
      }

      const changeSet = data.changeSet as ChangeSet
      const validation = ChangeSetValidator.validate(changeSet, sourceSpec)
      if (!validation.valid) {
        console.error("AI Design Assistant returned an invalid changeset", { projectId, errors: validation.errors })
        setAssistantFeedback({ tone: "error", message: t("assistantInvalid") })
        toast.error(t("assistantInvalid"))
        return
      }

      const applied = applyAssistantChangeSet(changeSet, sourceSpec)
      setLastRouteResult({ assistantLanguage: data.assistantLanguage, message: data.message })
      // Nothing applicable must never be reported as a success.
      if (applied === 0) {
        setAssistantFeedback({ tone: "error", message: t("assistantInvalid") })
        toast.error(t("assistantInvalid"))
        return
      }
      const successMessage = data.message || t("assistantApplied")
      setAssistantFeedback({ tone: "success", message: successMessage })
      toast.success(successMessage)
      setAiPrompt("")
    } catch (error) {
      console.error("AI Design Assistant network or state error", error)
      setAssistantFeedback({ tone: "error", message: t("assistantUnavailable") })
      toast.error(t("assistantUnavailable"))
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveVersion = async () => {
    if (!spec) return
    const response = await fetch(`/api/projects/${projectId}/website/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedSpec: spec, summary: `Edited ${selectedLanguage} website content` }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      toast.error(data.error || "Unable to save website version")
      return
    }
    setVersionNumber((current) => current + 1)
    toast.success(`Saved website version v${versionNumber + 1}!`)
  }

  const generateLocale = async (targetLanguage: AppLocale, sourceSnapshot: WebsiteSpecData | null): Promise<WebsiteSpecData | null> => {
    if (!sourceSnapshot || getWebsiteLocaleStatus(sourceSnapshot, targetLanguage) === "ready") return sourceSnapshot
    const primaryLanguage = getProjectLanguageConfig(sourceSnapshot).primaryLanguage
    const sourceCandidates = Array.from(new Set([primaryLanguage, ...getSupportedWebsiteLocales(sourceSnapshot), sourceSnapshot.language].filter((locale): locale is AppLocale => typeof locale === "string" && (ENABLED_LOCALES as readonly string[]).includes(locale))))
    const readySource = sourceCandidates.find((locale) => getWebsiteLocaleStatus(sourceSnapshot, locale) === "ready")
    const sourceLanguage = readySource || (ENABLED_LOCALES.includes(sourceSnapshot.language as AppLocale) ? sourceSnapshot.language as AppLocale : "en")
    if (sourceLanguage === targetLanguage) {
      toast.error(t("missingLanguage", { language: LOCALE_CONFIG[targetLanguage].nativeName }))
      return null
    }
    setTranslatingLocale(targetLanguage)
    try {
      const response = await fetch(`/api/projects/${projectId}/website/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLanguage, targetLanguage, spec: sourceSnapshot }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error("Website language generation failed", { projectId, locale: targetLanguage, status: response.status, error: data.error })
        toast.error(response.status === 429 ? t("rateLimited") : t("generationFailed"))
        return null
      }
      configStore?.replaceWebsiteSpec(data.spec)
      const nextSpec = (configStore?.getWebsiteSpec() || data.spec) as WebsiteSpecData
      setSpec(nextSpec)
      setHistory((current) => [...current, nextSpec])
      setHistoryIdx((current) => current + 1)
      setGeneratedLocale(targetLanguage)
      toast.success(`${targetLanguage.toUpperCase()} content generated`)
      return nextSpec
    } catch {
      toast.error(t("generationFailed"))
      return null
    } finally {
      setTranslatingLocale(null)
    }
  }

  const handleGenerateTranslation = () => {
    void generateLocale(selectedLanguage, spec)
  }

  const handleGenerateAllMissing = async () => {
    if (!spec || generatingAll) return
    const targets = languageDraftSupported.filter((locale) => getWebsiteLocaleStatus(spec, locale) !== "ready")
    if (targets.length === 0) {
      toast.success(t("generated"))
      return
    }
    setGeneratingAll(true)
    let workingSpec: WebsiteSpecData | null = spec
    try {
      for (const target of targets) {
        const next = await generateLocale(target, workingSpec)
        if (!next) break
        workingSpec = next
      }
    } finally {
      setGeneratingAll(false)
    }
  }

  const handleWebsiteLanguageConfig = async (nextPrimary: AppLocale, nextSupported: AppLocale[]) => {
    if (!spec) return
    const normalizedSupported = Array.from(new Set([nextPrimary, ...nextSupported.filter((locale) => locale !== nextPrimary)]))
    const response = await fetch(`/api/projects/${projectId}/language`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryLanguage: nextPrimary, supportedLanguages: normalizedSupported }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Unable to update website languages")
    const nextSpec = applyWebsiteLanguageConfig(syncPrimaryWebsiteContent(spec), { primaryLanguage: nextPrimary, supportedLanguages: normalizedSupported })
    configStore?.replaceWebsiteSpec(nextSpec)
    setSpec(configStore?.getWebsiteSpec() || nextSpec)
    setSelectedLanguage((current) => normalizedSupported.includes(current) ? current : nextPrimary)
  }

  const handleLanguageSelection = (locale: AppLocale) => {
    setSelectedLanguage(locale)
    setGeneratedLocale(null)
    if (!supportedWebsiteLocales.includes(locale)) {
      const primary = (spec?.primaryLanguage || "en") as AppLocale
      void handleWebsiteLanguageConfig(primary, [...supportedWebsiteLocales, locale]).catch((error) => {
        toast.error(error instanceof Error ? error.message : "Unable to update website languages")
      })
    }
  }

  const handlePrimaryLanguageChange = (locale: AppLocale) => {
    const nextSupported = Array.from(new Set([locale, ...supportedWebsiteLocales]))
    setSelectedLanguage(locale)
    setGeneratedLocale(null)
    void handleWebsiteLanguageConfig(locale, nextSupported).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update website languages")
    })
  }

  const openLanguageSettings = () => {
    if (!spec) return
    const config = getProjectLanguageConfig(spec)
    setLanguageDraftPrimary(config.primaryLanguage)
    setLanguageDraftSupported(config.supportedLanguages)
    setLanguageSettingsOpen(true)
  }

  const toggleDraftLanguage = (locale: AppLocale) => {
    setLanguageDraftSupported((current) => {
      if (current.includes(locale)) {
        if (locale === languageDraftPrimary || current.length === 1) return current
        return current.filter((item) => item !== locale)
      }
      return [...current, locale]
    })
  }

  const saveLanguageSettings = async () => {
    if (!spec || languageSettingsSaving) return
    const supported = Array.from(new Set([languageDraftPrimary, ...languageDraftSupported.filter((locale) => locale !== languageDraftPrimary)]))
    setLanguageSettingsSaving(true)
    try {
      await handleWebsiteLanguageConfig(languageDraftPrimary, supported)
      setLanguageSettingsOpen(false)
      toast.success(t("languageSaved"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("generationFailed"))
    } finally {
      setLanguageSettingsSaving(false)
    }
  }

  const handleDeployPreview = async () => {
    if (!spec) return
    if (!selectedLocaleReady) {
      toast.error(t("missingLanguage", { language: LOCALE_CONFIG[selectedLanguage].nativeName }))
      return
    }
    setDeployingPreview(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, locale: selectedLanguage })
      })
      if (!res.ok) throw new Error("Preview generation failed")
      const html = await res.text()
      const blob = new Blob([html], { type: "text/html" })
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      toast.success("Preview opened in a new tab!")
    } catch (err: any) {
      toast.error(err.message || "Failed to open preview")
    } finally {
      setDeployingPreview(false)
    }
  }

  const handlePublishAndGetLink = async () => {
    if (!spec) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/publish-spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec, locale: selectedLanguage })
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Publish failed")
      const siteUrl = data.url || `${window.location.origin}/site/${data.slug}`
      setPublishedUrl(siteUrl)
      setPublishedLocalizedUrls(data.localizedUrls || { [spec.primaryLanguage || "en"]: siteUrl })
      setShowPublishModal(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to publish site")
    } finally {
      setPublishing(false)
    }
  }

  const selectedSection = useMemo(() => {
    return activeSpec?.sections.find(s => s.id === selectedSectionId)
  }, [activeSpec, selectedSectionId])

  if (loading || !spec) {
    return (
      <div dir="ltr" className="min-h-screen bg-[#F7F4EB] text-neutral-900 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-700" />
        <span className="text-sm font-medium text-neutral-700">{t("loadingEditor")}</span>
      </div>
    )
  }

  return (
    <div dir="ltr" className="h-screen bg-[#F7F4EB] text-neutral-900 flex flex-col font-sans overflow-hidden">
      {/* Top Bar */}
      <header className="shrink-0 overflow-x-hidden border-b border-[#E5DFD4] bg-white px-3 py-2 shadow-sm">
        <div className="flex min-h-10 min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="order-1 flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/projects")}
              aria-label={t("back")}
              className="shrink-0 rounded-full p-2 text-neutral-500 hover:bg-[#F7F4EB] hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-neutral-900">
              <Sparkles className="h-4 w-4 shrink-0 text-pink-500" />
              <span className="truncate">{t("visualEditor")}</span>
            </div>
            <Badge className="shrink-0 rounded-full border border-[#E5DFD4] bg-[#FAF8F2] text-xs font-bold text-neutral-600">
              v{versionNumber}
            </Badge>
          </div>

          <div className="order-2 flex min-w-0 flex-wrap items-center justify-end gap-2 lg:order-3">
            <div className="flex min-w-0 items-center gap-1" aria-label={t("languageSelectorLabel")}>
              <Button variant="outline" size="sm" onClick={openLanguageSettings} className="h-8 gap-1.5 whitespace-nowrap rounded-full border-[#E5DFD4] px-2 text-[10px] font-bold text-neutral-700">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("wholeWebsite")}</span>
              </Button>
              <WebsiteLanguageSwitcher locales={ENABLED_LOCALES} currentLocale={selectedLanguage} onLocaleChange={handleLanguageSelection} />
            </div>
            <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
              <span className="hidden sm:inline">{t("primaryLanguage")}</span>
              <select
                aria-label={t("primaryLanguage")}
                value={(spec.primaryLanguage || "en") as AppLocale}
                onChange={(event) => handlePrimaryLanguageChange(event.target.value as AppLocale)}
                className="h-8 max-w-[7.5rem] rounded-full border border-[#E5DFD4] bg-white px-2 text-[11px] font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-300"
              >
                {ENABLED_LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_CONFIG[locale].nativeName}</option>)}
              </select>
            </label>
            {getWebsiteLocaleStatus(spec, selectedLanguage) !== "ready" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateTranslation}
                disabled={translatingLocale === selectedLanguage}
                className="h-8 whitespace-nowrap rounded-full border-[#E5DFD4] text-[10px] font-bold"
              >
                {translatingLocale === selectedLanguage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {translatingLocale === selectedLanguage
                  ? t("generating", { language: LOCALE_CONFIG[selectedLanguage].nativeName })
                  : t("generate", { language: LOCALE_CONFIG[selectedLanguage].nativeName })}
              </Button>
            )}
            {generatedLocale === selectedLanguage && <span aria-live="polite" className="whitespace-nowrap text-[10px] font-bold text-emerald-700">{t("generated")}</span>}
          </div>

          <div className="order-3 flex min-w-0 items-center gap-1 rounded-full border border-[#E5DFD4] bg-[#FAF8F2] p-1 lg:order-2">
            <Button
              variant={device === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("desktop")}
              aria-label="Desktop"
              className={`h-7 gap-1.5 rounded-full px-2 text-[11px] font-bold ${device === "desktop" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
            >
              <Monitor className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Desktop</span>
            </Button>
            <Button
              variant={device === "tablet" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("tablet")}
              aria-label="Tablet"
              className={`h-7 gap-1.5 rounded-full px-2 text-[11px] font-bold ${device === "tablet" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
            >
              <Tablet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Tablet</span>
            </Button>
            <Button
              variant={device === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDevice("mobile")}
              aria-label="Mobile"
              className={`h-7 gap-1.5 rounded-full px-2 text-[11px] font-bold ${device === "mobile" ? "bg-[#18181C] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
            >
              <Smartphone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mobile</span>
            </Button>
          </div>

          <div className="order-4 flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIdx <= 0}
              aria-label="Undo"
              className="h-8 rounded-full px-2 text-neutral-400 hover:bg-[#F7F4EB] hover:text-neutral-900"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              aria-label="Redo"
              className="h-8 rounded-full px-2 text-neutral-400 hover:bg-[#F7F4EB] hover:text-neutral-900"
            >
              <Redo className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveVersion}
              className="h-8 gap-1.5 whitespace-nowrap rounded-full border-[#E5DFD4] text-xs font-bold text-neutral-700 hover:bg-[#FAF8F2]"
            >
              <Save className="h-3.5 w-3.5" /> Save v{versionNumber + 1}
            </Button>
            <Button
              size="sm"
              onClick={handleDeployPreview}
              disabled={deployingPreview}
              className="h-8 gap-1.5 whitespace-nowrap rounded-full border border-[#E5DFD4] bg-white text-xs font-bold text-neutral-700 hover:bg-[#FAF8F2] disabled:opacity-60"
            >
              {deployingPreview ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("preparing")}</> : <><Rocket className="h-3.5 w-3.5" /> {t("preview")}</>}
            </Button>
            <Button
              size="sm"
              onClick={handlePublishAndGetLink}
              disabled={publishing}
              className="h-8 gap-1.5 whitespace-nowrap rounded-full bg-[#18181C] text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {publishing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("publishing")}</> : <><Globe className="h-3.5 h-3.5" /> {t("publish")}</>}
            </Button>
          </div>
        </div>
      </header>

      {languageSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("wholeWebsite")}>
          <div className="w-full max-w-lg rounded-3xl border border-[#E5DFD4] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900">{t("wholeWebsite")}</h2>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{t("languageSettingsDescription")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLanguageSettingsOpen(false)} aria-label={t("back")} className="rounded-full p-2 text-neutral-500 hover:bg-[#F7F4EB]">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5DFD4] bg-[#FAF8F2] p-3">
                <span className="text-xs font-extrabold text-neutral-700">{t("primaryLanguage")}</span>
                <select
                  value={languageDraftPrimary}
                  onChange={(event) => {
                    const next = event.target.value as AppLocale
                    setLanguageDraftPrimary(next)
                    setLanguageDraftSupported((current) => Array.from(new Set([next, ...current])))
                  }}
                  className="h-9 rounded-full border border-[#E5DFD4] bg-white px-3 text-xs font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-neutral-300"
                >
                  {ENABLED_LOCALES.map((locale) => <option key={locale} value={locale}>{LOCALE_CONFIG[locale].nativeName}</option>)}
                </select>
              </label>

              <div>
                <p className="mb-2 text-xs font-extrabold text-neutral-700">{t("additionalLanguages")}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ENABLED_LOCALES.map((locale) => {
                    const selected = languageDraftSupported.includes(locale)
                    const isPrimary = languageDraftPrimary === locale
                    return (
                      <button
                        key={locale}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleDraftLanguage(locale)}
                        className={`flex items-center justify-between rounded-2xl border px-3 py-3 text-left text-xs font-bold transition-colors ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-[#E5DFD4] bg-white text-neutral-700 hover:border-neutral-400"}`}
                      >
                        <span>{LOCALE_CONFIG[locale].nativeName}</span>
                        <span>{isPrimary ? "★" : selected ? "✓" : "+"}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setLanguageSettingsOpen(false)} className="rounded-full text-xs font-bold">{t("back")}</Button>
                <Button variant="outline" onClick={handleGenerateAllMissing} disabled={generatingAll || !spec} className="gap-1.5 rounded-full border-[#E5DFD4] text-xs font-bold">
                  {generatingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {t("generateAllMissing")}
                </Button>
                <Button onClick={saveLanguageSettings} disabled={languageSettingsSaving} className="gap-1.5 rounded-full bg-[#18181C] text-xs font-bold text-white hover:bg-neutral-800">
                  {languageSettingsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {t("applyLanguageSettings")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish Success Modal */}
      {showPublishModal && publishedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-[#E5DFD4] shadow-2xl p-8 w-full max-w-md mx-4 space-y-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="font-extrabold text-lg text-neutral-900">{t("sitePublished")}</h3>
                </div>
                <p className="text-xs text-neutral-500 pl-10">{t("publishedDescription")}</p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 rounded-full hover:bg-[#F7F4EB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Display */}
            <div className="bg-[#FAF8F2] border border-[#E5DFD4] rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">{t("liveSiteUrl")}</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-neutral-800 break-all leading-relaxed">{publishedUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(publishedUrl)
                    toast.success("Link copied to clipboard!")
                  }}
                  className="flex-1 h-8 text-xs bg-[#18181C] hover:bg-neutral-800 text-white gap-1.5 rounded-full font-bold"
                >
                  <Copy className="w-3.5 h-3.5" /> {t("copyLink")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(publishedUrl, "_blank")}
                  variant="outline"
                  className="flex-1 h-8 text-xs border-[#E5DFD4] text-neutral-700 hover:bg-[#FAF8F2] gap-1.5 rounded-full font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {t("openSite")}
                </Button>
              </div>
            </div>

            {Object.keys(publishedLocalizedUrls).length > 1 && <div className="rounded-2xl border border-[#E5DFD4] p-3"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">{t("localizedLinks")}</p><div className="space-y-1">{Object.entries(publishedLocalizedUrls).map(([locale, url]) => <a key={locale} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-[#FAF8F2]"><span>{LOCALE_CONFIG[locale as AppLocale]?.nativeName || locale}</span><ExternalLink className="h-3 w-3" /></a>)}</div></div>}

            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              {t("shareDescription")}
            </p>
          </div>
        </div>
      )}

      {/* Main Workspace (3-Column Layout) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Structure & Sections */}
        <aside className="w-72 border-r border-[#E5DFD4] bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-[#E5DFD4] font-extrabold text-xs text-neutral-500 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-pink-400" /> {t("structure")}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {spec.sections.map((sec, idx) => {
              const secId = sec.id || `section-${idx}`
              return (
                <div
                  key={secId}
                  onClick={() => setSelectedSectionId(secId)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                    selectedSectionId === secId
                      ? "bg-[#18181C] border-[#18181C] text-white font-bold shadow-sm"
                      : "bg-[#FAF8F2] border-[#E5DFD4] text-neutral-700 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-[10px] font-mono w-4 ${
                      selectedSectionId === secId ? "text-neutral-300" : "text-neutral-400"
                    }`}>{sec.order || idx + 1}</span>
                    <span className="truncate capitalize font-semibold">{secId}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleMoveSection(secId, "up")
                      }}
                      disabled={idx === 0}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleMoveSection(secId, "down")
                      }}
                      disabled={idx === spec.sections.length - 1}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        handleToggleSectionVisibility(secId)
                      }}
                      className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-900"
                    >
                      {sec.visible !== false ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-300" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* AI Assistant Section */}
          <div className="p-3 border-t border-[#E5DFD4] bg-[#FAF8F2] space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-neutral-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" /> {t("aiDesignAssistant")}</span>
              {lastRouteResult?.assistantLanguage && (
                <Badge className="rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">
                  {LOCALE_CONFIG[lastRouteResult.assistantLanguage as AppLocale]?.nativeName || lastRouteResult.assistantLanguage}
                </Badge>
              )}
            </div>

            <Textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder={t("assistantPlaceholder")}
              className="bg-white border-[#E5DFD4] text-xs text-neutral-800 resize-none h-16 focus:ring-1 focus:ring-neutral-400 rounded-xl"
            />

            <Button
              onClick={handleRunAiRequest}
              disabled={aiLoading || !aiPrompt.trim()}
              className="w-full bg-[#18181C] hover:bg-neutral-800 text-white text-xs h-8 gap-1.5 rounded-full font-bold"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("customizing")}
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> {t("applyRequirement")}
                </>
              )}
            </Button>

            {assistantFeedback && (
              <p
                role="status"
                aria-live="polite"
                data-testid="assistant-feedback"
                data-tone={assistantFeedback.tone}
                className={`rounded-xl border px-2.5 py-2 text-[11px] leading-relaxed ${
                  assistantFeedback.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {assistantFeedback.message}
              </p>
            )}
          </div>
        </aside>

        {/* Center Panel: Canvas Preview */}
        <main className="flex-1 bg-[#F7F4EB] flex flex-col items-center justify-start p-6 overflow-y-auto">
          <div
            className={`transition-all duration-300 bg-white text-neutral-900 shadow-xl rounded-2xl border border-[#E5DFD4] overflow-hidden ${
              device === "desktop"
                ? "w-full max-w-5xl min-h-[750px]"
                : device === "tablet"
                ? "w-[768px] min-h-[700px]"
                : "w-[375px] min-h-[650px]"
            }`}
          >
            {selectedLocaleReady ? (
              <SiteRenderer spec={activeSpec || spec} initialLocale={selectedLanguage} />
            ) : (
              <div className="flex min-h-[360px] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#D8D0C2] bg-[#FAF8F2] p-8 text-center">
                <Sparkles className="h-7 w-7 text-pink-500" />
                <p className="text-sm font-bold text-neutral-800">{t("missingLanguage", { language: LOCALE_CONFIG[selectedLanguage].nativeName })}</p>
                <Button onClick={handleGenerateTranslation} disabled={translatingLocale === selectedLanguage} className="gap-1.5 rounded-full bg-[#18181C] text-xs font-bold text-white hover:bg-neutral-800">
                  {translatingLocale === selectedLanguage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {translatingLocale === selectedLanguage ? t("generating", { language: LOCALE_CONFIG[selectedLanguage].nativeName }) : t("generate", { language: LOCALE_CONFIG[selectedLanguage].nativeName })}
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Right Panel: Property Inspector */}
        <aside className="w-80 border-l border-[#E5DFD4] bg-white flex flex-col shrink-0">
          <Tabs defaultValue="text" className="flex-1 flex flex-col">
            <TabsList className="bg-[#FAF8F2] border-b border-[#E5DFD4] rounded-none h-10 px-2 justify-start gap-1">
              <TabsTrigger value="text" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Type className="w-3.5 h-3.5" /> {t("text")}
              </TabsTrigger>
              <TabsTrigger value="theme" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Palette className="w-3.5 h-3.5" /> {t("theme")}
              </TabsTrigger>
              <TabsTrigger value="layout" className="text-xs font-bold data-[state=active]:bg-[#18181C] data-[state=active]:text-white rounded-full px-3 gap-1 transition-all">
                <Sliders className="w-3.5 h-3.5" /> {t("layout")}
              </TabsTrigger>
            </TabsList>

            {/* Text Properties Tab */}
            <TabsContent value="text" className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedLocaleReady ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-neutral-700">{t("businessName")}</label>
                    <Input
                      value={activeSpec?.siteName || ""}
                      onChange={e => handleUpdateBusinessName(e.target.value)}
                      className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl focus:ring-1 focus:ring-neutral-400"
                    />
                  </div>

                  {selectedSection ? (
                    <div className="space-y-4 border-t border-[#E5DFD4] pt-4">
                      <h4 className="text-xs font-extrabold text-pink-500 uppercase tracking-wider">
                        {t("editingSection", { section: selectedSection.id || "Section" })}
                      </h4>

                      {(selectedSection as any).headline !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-neutral-700">{t("headline")}</label>
                          <Input
                            value={(selectedSection as any).headline}
                            onChange={e => handleUpdateSectionContent(selectedSection.id || "", "headline", e.target.value)}
                            className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                          />
                        </div>
                      )}

                      {(selectedSection as any).subheadline !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-neutral-700">{t("subheadline")}</label>
                          <Textarea
                            value={(selectedSection as any).subheadline}
                            onChange={e => handleUpdateSectionContent(selectedSection.id || "", "subheadline", e.target.value)}
                            className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-16 resize-none rounded-xl"
                          />
                        </div>
                      )}

                      {(selectedSection as any).title !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-neutral-700">{t("sectionTitle")}</label>
                          <Input
                            value={(selectedSection as any).title}
                            onChange={e => handleUpdateSectionContent(selectedSection.id || "", "title", e.target.value)}
                            className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                          />
                        </div>
                      )}

                      {(selectedSection as any).body !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-neutral-700">{t("bodyCopy")}</label>
                          <Textarea
                            value={(selectedSection as any).body}
                            onChange={e => handleUpdateSectionContent(selectedSection.id || "", "body", e.target.value)}
                            className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-20 resize-none rounded-xl"
                          />
                        </div>
                      )}

                      {(selectedSection as any).ctaLabel !== undefined && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-neutral-700">{t("ctaLabel")}</label>
                          <Input
                            value={(selectedSection as any).ctaLabel}
                            onChange={e => handleUpdateSectionContent(selectedSection.id || "", "ctaLabel", e.target.value)}
                            className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-400 italic bg-[#FAF8F2] border border-[#E5DFD4] p-3 rounded-xl">{t("selectSection")}</div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D8D0C2] bg-[#FAF8F2] p-3 text-xs text-neutral-600">
                  {t("missingLanguage", { language: LOCALE_CONFIG[selectedLanguage].nativeName })}
                </div>
              )}
            </TabsContent>

            {/* Theme Properties Tab */}
            <TabsContent value="theme" className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral-700">{t("primaryColor")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={spec.theme.primary || "#0D9488"}
                    onChange={e => handleUpdatePrimaryColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border border-[#E5DFD4] bg-white cursor-pointer"
                  />
                  <Input
                    value={spec.theme.primary || "#0D9488"}
                    onChange={e => handleUpdatePrimaryColor(e.target.value)}
                    className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-9 font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-neutral-700">{t("themeStyle")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["MODERN", "CLASSIC", "BOLD"] as const).map(st => (
                    <Button
                      key={st}
                      size="sm"
                      onClick={() => {
                        if (!spec) return
                        const updated = JSON.parse(JSON.stringify(spec)) as WebsiteSpecData
                        updated.theme = { ...updated.theme, style: st }
                        pushState(updated)
                      }}
                      className={`text-[11px] h-8 rounded-xl font-bold border transition-all ${
                        spec.theme.style === st
                          ? "bg-[#18181C] text-white border-[#18181C]"
                          : "bg-[#FAF8F2] text-neutral-700 border-[#E5DFD4] hover:border-neutral-400"
                      }`}
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Layout Tab */}
            <TabsContent value="layout" className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-neutral-700">
              <div className="space-y-2">
                <label className="font-extrabold text-neutral-700">{t("textAlignment")}</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#E5DFD4] rounded-xl font-bold">{t("left")}</Button>
                  <Button size="sm" className="h-8 text-xs bg-[#18181C] text-white rounded-xl font-bold">{t("center")}</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-[#E5DFD4] rounded-xl font-bold">{t("right")}</Button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5DFD4]">
                <label className="font-extrabold text-neutral-700">{t("sectionPadding")}</label>
                <Input defaultValue="py-16 px-6" className="bg-[#FAF8F2] border-[#E5DFD4] text-xs text-neutral-900 h-8 rounded-xl" />
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}
