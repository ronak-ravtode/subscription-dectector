import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "./ScoreBadge";
import { ActionBadge } from "./ActionBadge";
import { Subscription } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface SubscriptionCardProps {
  subscription: Subscription;
  onClick?: () => void;
}

export function SubscriptionCard({ subscription, onClick }: SubscriptionCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-150 hover:bg-soft-cloud",
        onClick && "hover:border-ink/30"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {subscription.merchant}
          <ArrowUpRight className="h-3 w-3 text-mute opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
        <ScoreBadge score={subscription.leak_score} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-medium font-mono tracking-tight">
          {formatCurrency(subscription.amount)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-mute">
          <span className="capitalize px-2 py-1 bg-soft-cloud rounded-full">
            {subscription.frequency}
          </span>
          <span className="capitalize px-2 py-1 bg-soft-cloud rounded-full">
            {subscription.category}
          </span>
        </div>
        <div className="mt-2">
          <ActionBadge action={subscription.action} />
        </div>
      </CardContent>
    </Card>
  );
}
