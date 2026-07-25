import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Subscription } from "@/lib/types";

interface CategoryBreakdownTableProps {
  subscriptions: Subscription[];
}

interface CategoryData {
  category: string;
  monthly: number;
  annual: number;
}

export function CategoryBreakdownTable({ subscriptions }: CategoryBreakdownTableProps) {
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const sub of subscriptions) {
      const cat = sub.category || "other";
      map.set(cat, (map.get(cat) || 0) + sub.amount);
    }
    const result: CategoryData[] = [];
    for (const [category, monthly] of map) {
      result.push({ category, monthly, annual: monthly * 12 });
    }
    result.sort((a, b) => b.monthly - a.monthly);
    return result;
  }, [subscriptions]);

  if (categoryData.length === 0) return null;

  return (
    <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
      <CardHeader className="pb-2 pt-6 px-6">
        <CardTitle className="text-xl font-semibold text-primary">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-2 flex-1">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Category</TableHead>
              <TableHead className="px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">Monthly</TableHead>
              <TableHead className="px-6 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider text-right">Annual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryData.map((cat) => (
              <TableRow key={cat.category} className="border-border/60 hover:bg-secondary/80 transition-colors">
                <TableCell className="px-6 py-4 capitalize text-foreground font-medium">{cat.category}</TableCell>
                <TableCell className="px-6 py-4 text-right font-semibold text-primary">
                  ${cat.monthly.toFixed(2)}
                </TableCell>
                <TableCell className="px-6 py-4 text-right text-muted-foreground">
                  ${cat.annual.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
