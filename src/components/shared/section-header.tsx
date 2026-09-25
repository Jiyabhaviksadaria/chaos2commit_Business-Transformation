import React from "react"
import { cn } from "@/lib/utils"

export interface SectionHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5",
        className
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-1">
            {eyebrow}
          </p>
        )}
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-neutral-900">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-neutral-500 mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}
