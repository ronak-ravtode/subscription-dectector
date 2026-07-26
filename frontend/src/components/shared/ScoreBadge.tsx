import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
}

function getScoreConfig(score: number) {
  if (score <= 30) {
    return {
      className: "bg-success/10 text-success border-success/20",
      label: "Good",
    };
  }
  if (score <= 60) {
    return {
      className: "bg-sale/10 text-sale border-sale/20",
      label: "Fair",
    };
  }
  if (score <= 80) {
    return {
      className: "bg-sale/10 text-sale border-sale/20",
      label: "Caution",
    };
  }
  return {
    className: "bg-sale text-canvas border-sale",
    label: "Critical",
  };
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const config = getScoreConfig(score);

  return (
    <Badge
      variant="outline"
      className={cn("font-mono font-medium gap-1", config.className)}
    >
      <span className="text-xs opacity-70">{score}</span>
      <span>/100</span>
    </Badge>
  );
}
