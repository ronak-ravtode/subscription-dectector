import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Action } from "@/lib/types";

interface ActionBadgeProps {
  action: Action;
}

const actionStyles: Record<Action, string> = {
  keep: "bg-green-100 text-green-800 border-green-200",
  review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  downgrade: "bg-orange-100 text-orange-800 border-orange-200",
  renegotiate: "bg-blue-100 text-blue-800 border-blue-200",
  cancel: "bg-red-100 text-red-800 border-red-200",
};

export function ActionBadge({ action }: ActionBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", actionStyles[action])}
    >
      {action}
    </Badge>
  );
}