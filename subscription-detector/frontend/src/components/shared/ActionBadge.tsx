import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Action } from "@/lib/types";
import { CheckCircle, AlertCircle, ArrowDown, RefreshCw, XCircle } from "lucide-react";

interface ActionBadgeProps {
  action: Action;
}

const actionConfig: Record<Action, { className: string; icon: typeof CheckCircle }> = {
  keep: {
    className: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  review: {
    className: "bg-sale/10 text-sale border-sale/20",
    icon: AlertCircle,
  },
  downgrade: {
    className: "bg-sale/10 text-sale border-sale/20",
    icon: ArrowDown,
  },
  renegotiate: {
    className: "bg-info/10 text-info border-info/20",
    icon: RefreshCw,
  },
  cancel: {
    className: "bg-sale text-canvas border-sale",
    icon: XCircle,
  },
};

export function ActionBadge({ action }: ActionBadgeProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("capitalize gap-1.5", config.className)}
    >
      <Icon className="h-3 w-3" />
      {action}
    </Badge>
  );
}
