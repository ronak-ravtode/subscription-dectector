import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSummary } from "@/hooks/useSummary";
import { useHistory } from "@/hooks/useHistory";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useSpendingTrend } from "@/hooks/useSpendingTrend";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { SpendingTrendChart } from "@/components/shared/SpendingTrendChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, Upload, AlertTriangle, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: history, isLoading: historyLoading } = useHistory(1, 5);
  const { data: subscriptions } = useSubscriptions();
  const { data: trend, isLoading: trendLoading } = useSpendingTrend();

  const categoryData = useMemo(() => {
    if (!subscriptions) return [];
    const grouped = subscriptions.reduce((acc, sub) => {
      const cat = sub.category || "other";
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, totalAmount: 0 };
      acc[cat].count++;
      acc[cat].totalAmount += sub.amount;
      return acc;
    }, {} as Record<string, { category: string; count: number; totalAmount: number }>);
    return Object.values(grouped);
  }, [subscriptions]);

  return (
    <PageWrapper title="Dashboard">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your subscription leak overview.
        </p>
        <Button asChild>
          <Link to="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Statement
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {summaryLoading ? (
          <>
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </>
        ) : (
          <>
            <SummaryCard
              title="Total Monthly Leak"
              value={formatCurrency(summary?.total_monthly_leak || 0)}
              icon={DollarSign}
              description={`${formatCurrency(summary?.total_annual_leak || 0)}/year`}
            />
            <SummaryCard
              title="Potential Savings"
              value={formatCurrency(summary?.potential_savings || 0)}
              icon={TrendingDown}
              description="Estimated monthly savings"
            />
            <SummaryCard
              title="Subscriptions"
              value={String(summary?.subscription_count || 0)}
              icon={AlertTriangle}
              description={`${summary?.high_risk_count || 0} high risk`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <SpendingTrendChart data={trend || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Analyses</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/history">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : history?.analyses && history.analyses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Leak</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Subscriptions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.analyses.map((item) => (
                  <TableRow key={item.analysis_id}>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>
                      <span className="capitalize">{item.status}</span>
                    </TableCell>
                    <TableCell>{formatCurrency(item.total_monthly_leak)}</TableCell>
                    <TableCell>
                      <ScoreBadge score={item.overall_score} />
                    </TableCell>
                    <TableCell>{item.subscription_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No analyses yet. Upload your first bank statement to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
