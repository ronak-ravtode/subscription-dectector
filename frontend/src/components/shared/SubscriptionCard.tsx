import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "./ScoreBadge";
import { ActionBadge } from "./ActionBadge";
import { Subscription } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface SubscriptionCardProps {
  subscription: Subscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const { user } = useAuthStore();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {subscription.merchant}
        </CardTitle>
        <ScoreBadge score={subscription.leak_score} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(subscription.amount)}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{subscription.frequency}</span>
          <span className="capitalize">{subscription.category}</span>
        </div>
        <div className="mt-2">
          <ActionBadge action={subscription.action} />
        </div>
      </CardContent>
    </Card>
  );
}