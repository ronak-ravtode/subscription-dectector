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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Annual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryData.map((cat) => (
              <TableRow key={cat.category}>
                <TableCell className="capitalize">{cat.category}</TableCell>
                <TableCell className="text-right font-mono">
                  ${cat.monthly.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
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
