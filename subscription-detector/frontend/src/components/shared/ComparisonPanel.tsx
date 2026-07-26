import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Comparison } from "@/lib/types";

interface ComparisonPanelProps {
  comparison: Comparison | undefined;
}

export function ComparisonPanel({ comparison }: ComparisonPanelProps) {
  if (!comparison) return null;

  const hasChanges =
    comparison.new_subscriptions.length > 0 ||
    comparison.removed_subscriptions.length > 0 ||
    comparison.price_changes.length > 0;

  if (!hasChanges) return null;

  return (
    <Card className="border border-hairline">
      <CardHeader>
        <CardTitle className="text-lg">
          Compared to Previous Analysis
          {comparison.previous_date && (
            <span className="text-sm font-normal text-mute ml-2">
              ({new Date(comparison.previous_date).toLocaleDateString()})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {comparison.new_subscriptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1">
                <ArrowUp className="h-3 w-3" />
                +{comparison.new_subscriptions.length} new
              </Badge>
              <span className="text-xs text-mute">
                {comparison.new_subscriptions.join(", ")}
              </span>
            </div>
          )}
          {comparison.removed_subscriptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-1">
                <ArrowDown className="h-3 w-3" />
                -{comparison.removed_subscriptions.length} removed
              </Badge>
              <span className="text-xs text-mute">
                {comparison.removed_subscriptions.join(", ")}
              </span>
            </div>
          )}
          {comparison.price_changes.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="gap-1">
                <Minus className="h-3 w-3" />
                {comparison.price_changes.length} price change{comparison.price_changes.length > 1 ? "s" : ""}
              </Badge>
            </div>
          )}
          {comparison.score_change !== 0 && (
            <Badge
              variant={comparison.score_change > 0 ? "destructive" : "success"}
              className="gap-1"
            >
              {comparison.score_change > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              Score {comparison.score_change > 0 ? "+" : ""}{comparison.score_change}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
