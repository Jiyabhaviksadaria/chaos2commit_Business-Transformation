import React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  iconColor?: string
  iconBg?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconColor = "text-neutral-500",
  iconBg = "bg-[#FAF8F2]",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-[#E5DFD4] bg-white p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs",
        className
      )}
    >
      <div
        className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center border border-[#E5DFD4]",
          iconBg,
          iconColor
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-sm sm:text-base font-extrabold text-neutral-900">
        {title}
      </h3>
      <p className="mt-1 text-xs text-neutral-500 max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
