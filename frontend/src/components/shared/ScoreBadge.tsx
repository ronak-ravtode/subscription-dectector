import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
}

function getScoreVariant(score: number) {
  if (score <= 30) return "bg-green-100 text-green-800 border-green-200";
  if (score <= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (score <= 80) return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", getScoreVariant(score))}
    >
      {score}/100
    </Badge>
  );
}