import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-[#18181C] hover:bg-neutral-800 text-white shadow-xs",
        primary:
          "bg-[#18181C] hover:bg-neutral-800 text-white shadow-xs",
        accent:
          "bg-[#FEE895] hover:bg-amber-300 text-neutral-900 border border-amber-300/80 shadow-xs",
        secondary:
          "bg-white hover:bg-[#FAF8F2] border border-[#E5DFD4] text-neutral-800 shadow-xs",
        outline:
          "bg-white hover:bg-[#FAF8F2] border border-[#E5DFD4] text-neutral-800 shadow-xs",
        ghost:
          "hover:bg-[#FAF8F2] text-neutral-700 hover:text-neutral-900 font-semibold",
        destructive:
          "bg-red-600 hover:bg-red-700 text-white shadow-xs",
        link:
          "text-neutral-900 underline-offset-4 hover:underline font-semibold",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
