import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
}

function getScoreVariant(score: number) {
  if (score <= 30) return "bg-success/10 text-success";
  if (score <= 60) return "bg-warning/10 text-warning";
  if (score <= 80) return "bg-orange-100 text-orange-700";
  return "bg-danger/10 text-danger";
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-semibold rounded-full border-none px-2.5 py-0.5", getScoreVariant(score))}
    >
      {score}/100
    </Badge>
  );
}