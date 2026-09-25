"use client"

import React, { useRef, useState, useEffect } from "react"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StageTabItem {
  value: string
  label: string
  badge?: string
}

export const DEFAULT_STAGE_TABS: StageTabItem[] = [
  { value: "overview", label: "Overview" },
  { value: "discovery", label: "Discovery" },
  { value: "business-analysis", label: "Business Analysis" },
  { value: "requirements", label: "Requirements" },
  { value: "blueprint", label: "Blueprint" },
  { value: "solutions", label: "Solutions" },
  { value: "architecture", label: "Architecture" },
  { value: "processes", label: "Processes" },
  { value: "ux", label: "UX" },
  { value: "database", label: "Database" },
  { value: "apis", label: "APIs" },
  { value: "planning", label: "Planning" },
  { value: "roadmap", label: "Roadmap" },
  { value: "build", label: "Build" },
  { value: "collaboration", label: "Collaboration" },
  { value: "versions", label: "Versions" },
  { value: "exports", label: "Exports" },
]

export interface ProjectNavTabsProps {
  activeTab: string
  onTabChange: (value: string) => void
  tabs?: StageTabItem[]
  className?: string
}

export function ProjectNavTabs({
  activeTab,
  tabs = DEFAULT_STAGE_TABS,
  className,
}: ProjectNavTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 4)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", checkScroll, { passive: true })
    window.addEventListener("resize", checkScroll)
    return () => {
      el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [tabs])

  // Scroll active tab into view smoothly
  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector<HTMLElement>(`[data-tab-value="${activeTab}"]`)
    if (activeEl) {
      const parentRect = scrollRef.current.getBoundingClientRect()
      const elRect = activeEl.getBoundingClientRect()
      if (elRect.left < parentRect.left || elRect.right > parentRect.right) {
        activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [activeTab])

  const scrollBy = (offset: number) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" })
  }

  return (
    <div
      className={cn(
        "relative flex items-center bg-[#FAF8F2] border border-[#E5DFD4] rounded-[24px] p-1 shadow-xs group",
        className
      )}
    >
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          aria-label="Scroll tabs left"
          className="absolute left-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm border border-[#E5DFD4] hover:bg-neutral-100 hover:text-neutral-900 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto scrollbar-none overscroll-x-contain py-0.5 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <TabsList className="min-w-max bg-transparent space-x-1 h-auto p-0 flex items-center">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              data-tab-value={tab.value}
              className="h-8 sm:h-9 px-3.5 sm:px-4 text-xs font-bold rounded-full transition-all text-neutral-600 hover:text-neutral-900 hover:bg-white/80 data-[state=active]:bg-[#18181C] data-[state=active]:text-white data-[state=active]:shadow-xs"
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded-full bg-amber-200 text-neutral-900 font-extrabold">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          aria-label="Scroll tabs right"
          className="absolute right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm border border-[#E5DFD4] hover:bg-neutral-100 hover:text-neutral-900 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
