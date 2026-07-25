import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Action } from "@/lib/types";

interface ActionBadgeProps {
  action: Action;
}

const actionStyles: Record<Action, string> = {
  keep: "bg-success/10 text-success",
  review: "bg-warning/10 text-warning",
  downgrade: "bg-orange-100 text-orange-700",
  renegotiate: "bg-accent/10 text-accent",
  cancel: "bg-danger/10 text-danger",
};

export function ActionBadge({ action }: ActionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize rounded-full border-none px-2.5 py-0.5 font-semibold", actionStyles[action])}
    >
      {action}
    </Badge>
  );
}