import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSummary } from "@/hooks/useSummary";
import { useHistory } from "@/hooks/useHistory";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useSpendingTrend } from "@/hooks/useSpendingTrend";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { DashboardHero } from "@/components/layout/DashboardHero";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { SpendingTrendChart } from "@/components/shared/SpendingTrendChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, Upload, AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

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
    <PageWrapper hero={<DashboardHero />}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >

      <div className="grid gap-6 md:grid-cols-3 mb-10">
        {summaryLoading ? (
          <>
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
          </>
        ) : (
          <>
            <SummaryCard
              title="Total Monthly Leak"
              value={formatCurrency(summary?.total_monthly_leak || 0)}
              icon={DollarSign}
              iconWrapperClass="bg-accent/10 text-accent"
              description={`${formatCurrency(summary?.total_annual_leak || 0)} / year`}
            />
            <SummaryCard
              title="Potential Savings"
              value={formatCurrency(summary?.potential_savings || 0)}
              icon={TrendingDown}
              iconWrapperClass="bg-success/10 text-success"
              description="Estimated monthly savings"
            />
            <SummaryCard
              title="Subscriptions"
              value={String(summary?.subscription_count || 0)}
              icon={ShieldAlert}
              iconWrapperClass="bg-danger/10 text-danger"
              description={`${summary?.high_risk_count || 0} high risk`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-10">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xl font-semibold text-primary">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-2 pt-6 px-6">
            <CardTitle className="text-xl font-semibold text-primary">Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {trendLoading ? (
              <Skeleton className="h-[300px] w-full rounded-xl mt-4" />
            ) : (
              <SpendingTrendChart data={trend || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 mb-8">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b border-slate-100">
          <CardTitle className="text-xl font-semibold text-primary">Recent Analyses</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-accent hover:text-accent hover:bg-accent/10 rounded-lg">
            <Link to="/history">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : history?.analyses && history.analyses.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="px-6 py-4 font-medium text-slate-500">Date</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-slate-500">Status</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-slate-500">Monthly Leak</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-slate-500">Score</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-slate-500">Subscriptions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.analyses.map((item) => (
                  <TableRow key={item.analysis_id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 py-4 text-slate-700">{formatDate(item.created_at)}</TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="capitalize text-slate-600 font-medium">{item.status}</span>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-semibold text-primary">{formatCurrency(item.total_monthly_leak)}</TableCell>
                    <TableCell className="px-6 py-4">
                      <ScoreBadge score={item.overall_score} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-slate-600">{item.subscription_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Upload className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-primary">No analyses yet</h3>
              <p className="text-slate-500 mt-1 max-w-sm">
                Upload your first bank statement to start detecting subscription leaks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </PageWrapper>
  );
}
