import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  trend,
  trendValue,
}: SummaryCardProps) {
  return (
    <Card className={cn("border border-hairline", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-mute">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-mute" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-medium tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {description && (
            <p className="text-sm text-mute">{description}</p>
          )}
          {trend && trendValue && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                trend === "up" && "bg-sale/10 text-sale",
                trend === "down" && "bg-success/10 text-success",
                trend === "neutral" && "bg-soft-cloud text-mute"
              )}
            >
              {trend === "up" ? "+" : trend === "down" ? "-" : ""}
              {trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
