import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Compared to Previous Analysis
          {comparison.previous_date && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({new Date(comparison.previous_date).toLocaleDateString()})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {comparison.new_subscriptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <ArrowUp className="h-3 w-3 mr-1" />
                +{comparison.new_subscriptions.length} new
              </Badge>
              <span className="text-xs text-muted-foreground">
                {comparison.new_subscriptions.join(", ")}
              </span>
            </div>
          )}
          {comparison.removed_subscriptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                <ArrowDown className="h-3 w-3 mr-1" />
                -{comparison.removed_subscriptions.length} removed
              </Badge>
              <span className="text-xs text-muted-foreground">
                {comparison.removed_subscriptions.join(", ")}
              </span>
            </div>
          )}
          {comparison.price_changes.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                <Minus className="h-3 w-3 mr-1" />
                {comparison.price_changes.length} price change{comparison.price_changes.length > 1 ? "s" : ""}
              </Badge>
            </div>
          )}
          {comparison.score_change !== 0 && (
            <Badge variant="outline" className={comparison.score_change > 0 ? "text-red-600" : "text-green-600"}>
              Score {comparison.score_change > 0 ? "+" : ""}{comparison.score_change}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
