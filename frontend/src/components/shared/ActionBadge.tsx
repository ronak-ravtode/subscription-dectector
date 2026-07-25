import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Action } from "@/lib/types";
import { motion } from "framer-motion";

interface ActionBadgeProps {
  action: Action;
}

const actionStyles: Record<Action, string> = {
  keep: "bg-success/10 text-success border-success/30",
  review: "bg-warning/10 text-warning border-warning/30",
  downgrade: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  renegotiate: "bg-accent/10 text-accent border-accent/30",
  cancel: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ActionBadge({ action }: ActionBadgeProps) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
      <Badge
        variant="outline"
        className={cn(
          "capitalize rounded-full px-3 py-1 font-bold text-[13px] border shadow-sm transition-colors",
          actionStyles[action]
        )}
      >
        {action}
      </Badge>
    </motion.div>
  );
}