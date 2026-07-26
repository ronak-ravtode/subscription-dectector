import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ink text-canvas",
        secondary:
          "border-transparent bg-soft-cloud text-ink",
        destructive:
          "border-transparent bg-sale text-canvas",
        outline: "text-ink border-hairline",
        success:
          "border-transparent bg-success/10 text-success",
        warning:
          "border-transparent bg-sale/10 text-sale",
        info:
          "border-transparent bg-info/10 text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
