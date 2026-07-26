import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3 } from "lucide-react";
import type { Subscription } from "@/lib/types";

interface CategoryBreakdownTableProps {
  subscriptions: Subscription[];
}

interface CategoryData {
  category: string;
  monthly: number;
  annual: number;
  percentage: number;
}

// Same accessible palette as pie chart
const CHART_COLORS = [
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#F43F5E", // Rose
  "#14B8A6", // Teal
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#84CC16", // Lime
];

export function CategoryBreakdownTable({ subscriptions }: CategoryBreakdownTableProps) {
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const sub of subscriptions) {
      const cat = sub.category || "other";
      const amount = sub.amount;
      map.set(cat, (map.get(cat) || 0) + amount);
      total += amount;
    }
    const result: CategoryData[] = [];
    for (const [category, monthly] of map) {
      result.push({
        category,
        monthly,
        annual: monthly * 12,
        percentage: total > 0 ? (monthly / total) * 100 : 0,
      });
    }
    result.sort((a, b) => b.monthly - a.monthly);
    return result;
  }, [subscriptions]);

  if (categoryData.length === 0) return null;

  return (
    <Card className="border border-hairline">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-mute" />
          Category Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-soft-cloud">
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Annual</TableHead>
              <TableHead className="text-right w-32">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryData.map((cat, index) => (
              <TableRow key={cat.category} className="hover:bg-soft-cloud/50 transition-colors">
                <TableCell className="capitalize font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {cat.category}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  ₹{cat.monthly.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-mute">
                  ₹{cat.annual.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-2.5 bg-soft-cloud rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs text-mute font-mono w-10 text-right">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
