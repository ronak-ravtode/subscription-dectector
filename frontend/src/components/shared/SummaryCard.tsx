import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  className?: string;
  iconWrapperClass?: string;
}

export function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  iconWrapperClass,
}: SummaryCardProps) {
  return (
    <Card className={cn("rounded-2xl border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
        <CardTitle className="text-base font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-secondary", iconWrapperClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <div className="text-4xl font-bold text-primary tracking-tight">{value}</div>
        {description && (
          <p className="mt-2 text-sm font-medium text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}