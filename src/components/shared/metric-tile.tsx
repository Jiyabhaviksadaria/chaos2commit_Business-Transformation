import React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MetricTileProps {
  label: string
  value: React.ReactNode
  detail?: string
  icon?: LucideIcon
  iconTone?: "neutral" | "positive" | "warning" | "destructive" | "accent" | "ai"
  trend?: "up" | "down"
  trendText?: string
  badge?: React.ReactNode
  onClick?: () => void
  className?: string
}

const toneMap = {
  neutral: "bg-[#FAF8F2] border-[#E5DFD4] text-neutral-700",
  positive: "bg-emerald-50 border-emerald-100 text-emerald-800",
  warning: "bg-amber-50 border-amber-100 text-amber-800",
  destructive: "bg-red-50 border-red-100 text-red-800",
  accent: "bg-[#FEE895] border-amber-300 text-neutral-900",
  ai: "bg-purple-50 border-purple-100 text-purple-800",
}

export function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  iconTone = "neutral",
  trend,
  trendText,
  badge,
  onClick,
  className,
}: MetricTileProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-xs transition-all",
        onClick && "cursor-pointer hover:border-neutral-400 hover:shadow-sm active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 block truncate">
            {label}
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
            {value}
          </div>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              toneMap[iconTone]
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {(detail || trendText || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E5DFD4]/60 pt-2 text-[11px]">
          {detail && <span className="text-neutral-500 truncate">{detail}</span>}
          {trendText && (
            <span
              className={cn(
                "font-bold shrink-0",
                trend === "up" ? "text-emerald-700" : trend === "down" ? "text-red-700" : "text-neutral-600"
              )}
            >
              {trendText}
            </span>
          )}
          {badge && <div className="ml-auto shrink-0">{badge}</div>}
        </div>
      )}
    </div>
  )
}
