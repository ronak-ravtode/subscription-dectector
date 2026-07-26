import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-none animate-shimmer", className)}
      {...props}
    />
  )
}

export { Skeleton }
