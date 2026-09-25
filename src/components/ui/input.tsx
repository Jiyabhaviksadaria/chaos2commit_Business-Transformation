import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-[#E5DFD4] bg-[#FAF8F2] px-3.5 py-2 text-xs text-neutral-900 transition-colors file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-800 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
