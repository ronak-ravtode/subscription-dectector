import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScoreBadgeProps {
  score: number;
}

function getScoreVariant(score: number) {
  if (score <= 30) return "bg-success/10 text-success border-success/30";
  if (score <= 60) return "bg-warning/10 text-warning border-warning/30";
  if (score <= 80) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";
  return "bg-destructive/10 text-destructive border-destructive/30";
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
      <Badge
        variant="outline"
        className={cn(
          "font-bold rounded-full px-3 py-1 text-[13px] border shadow-sm transition-colors",
          getScoreVariant(score)
        )}
      >
        {score}/100
      </Badge>
    </motion.div>
  );
}