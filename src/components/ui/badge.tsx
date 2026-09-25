import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900/20",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#18181C] text-white",
        primary:
          "border-transparent bg-[#18181C] text-white",
        accent:
          "border-amber-300/80 bg-[#FEE895] text-neutral-950",
        secondary:
          "border-[#E5DFD4] bg-[#FAF8F2] text-neutral-800",
        outline:
          "border-[#E5DFD4] bg-white text-neutral-800",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800",
        destructive:
          "border-red-200 bg-red-50 text-red-800",
        ai:
          "border-purple-200 bg-purple-50 text-purple-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
