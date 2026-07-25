import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  let variantClass = "";
  switch (normalizedStatus) {
    case "complete":
    case "completed":
      variantClass = "bg-success/10 text-success border-success/30";
      break;
    case "pending":
      variantClass = "bg-warning/10 text-warning border-warning/30";
      break;
    case "failed":
      variantClass = "bg-destructive/10 text-destructive border-destructive/30";
      break;
    default:
      variantClass = "bg-secondary text-muted-foreground border-border";
  }

  return (
    <motion.div whileHover={{ scale: 1.05 }} className="inline-block">
      <Badge
        variant="outline"
        className={cn(
          "capitalize rounded-full px-3 py-1 font-bold text-[13px] border shadow-sm transition-colors",
          variantClass
        )}
      >
        {status}
      </Badge>
    </motion.div>
  );
}
