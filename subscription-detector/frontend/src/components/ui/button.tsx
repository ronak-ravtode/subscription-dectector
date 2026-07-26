import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-canvas hover:bg-ink/90 focus-visible:ring-ink",
        destructive:
          "bg-sale text-canvas hover:bg-sale-deep focus-visible:ring-sale",
        outline:
          "border border-hairline bg-transparent text-ink hover:bg-soft-cloud focus-visible:ring-ink",
        secondary:
          "bg-soft-cloud text-ink hover:bg-soft-cloud/80 focus-visible:ring-ink",
        ghost:
          "hover:bg-soft-cloud text-ink focus-visible:ring-ink",
        link:
          "text-ink underline-offset-4 hover:underline focus-visible:ring-ink",
        "on-image":
          "bg-canvas text-ink hover:bg-canvas/90 focus-visible:ring-ink",
      },
      size: {
        default: "h-12 px-8 rounded-lg",
        sm: "h-10 px-6 rounded-lg text-xs",
        lg: "h-14 px-10 rounded-lg text-base",
        xl: "h-16 px-12 rounded-lg text-lg",
        icon: "h-10 w-10 rounded-full",
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
