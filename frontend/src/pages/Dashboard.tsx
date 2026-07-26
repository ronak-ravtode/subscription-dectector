import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSummary } from "@/hooks/useSummary";
import { useHistory } from "@/hooks/useHistory";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useEmailStatus } from "@/hooks/useEmailStatus";
import { useEmailResults } from "@/hooks/useEmailResults";
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
import { DollarSign, TrendingDown, Upload, AlertTriangle, ArrowRight, CreditCard, Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: history, isLoading: historyLoading } = useHistory(1, 5);
  const { data: subscriptions } = useSubscriptions();
  const { data: trend, isLoading: trendLoading } = useSpendingTrend();
  const { data: emailStatus } = useEmailStatus();
  const { data: emailResults } = useEmailResults(10);

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
    <PageWrapper title="Dashboard" description="Welcome back! Here's your subscription leak overview.">
      <div className="mb-section flex items-center justify-between">
        <div />
        <Button asChild>
          <Link to="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Statement
          </Link>
        </Button>
      </div>

      <div className="grid gap-sm md:grid-cols-3 mb-section">
        {summaryLoading ? (
          <>
            <Skeleton className="h-[140px]" />
            <Skeleton className="h-[140px]" />
            <Skeleton className="h-[140px]" />
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
              icon={CreditCard}
              description={`${summary?.high_risk_count || 0} high risk`}
            />
          </>
        )}
      </div>

      {emailStatus && (
        <Card className="border border-hairline mb-section">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-mute" />
              Email Scanning
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/email">
                {emailStatus.connected ? "Manage" : "Connect Gmail"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              {emailStatus.connected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Connected: {emailStatus.email}</p>
                    <p className="text-sm text-mute">
                      {emailStatus.emails_scanned} emails scanned · {emailStatus.subscriptions_detected} subscriptions detected
                      {emailStatus.last_scan && (
                        <> · Last scan: {new Date(emailStatus.last_scan).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-mute" />
                  <div>
                    <p className="font-medium">Not connected</p>
                    <p className="text-sm text-mute">Connect your Gmail to automatically detect subscriptions from emails.</p>
                  </div>
                </>
              )}
            </div>

            {emailResults && emailResults.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">Recent Scan Results</p>
                <div className="space-y-2">
                  {emailResults.slice(0, 5).map((result) => (
                    <div key={result.id} className="flex items-center justify-between text-sm p-2 bg-soft-cloud/50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.subject || "No subject"}</p>
                        <p className="text-mute text-xs truncate">{result.from_email}</p>
                      </div>
                      <div className="text-right ml-4">
                        {result.merchant_detected ? (
                          <p className="font-medium">{result.merchant_detected}</p>
                        ) : null}
                        {result.amount_detected ? (
                          <p className="text-mute text-xs">${result.amount_detected.toFixed(2)}</p>
                        ) : null}
                        {result.is_recurring && (
                          <span className="inline-block px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Recurring</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-section md:grid-cols-2 mb-section">
        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-mute" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
        <Card className="border border-hairline">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-mute" />
              Monthly Spending Trend
            </CardTitle>
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

      <Card className="border border-hairline">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-mute" />
            Recent Analyses
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/history">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : history?.analyses && history.analyses.length > 0 ? (
            <div className="border border-hairline overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-soft-cloud">
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Monthly Leak</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Subscriptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.analyses.map((item) => (
                    <TableRow key={item.analysis_id} className="hover:bg-soft-cloud/50 transition-colors">
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                      <TableCell>
                        <span className="capitalize px-2 py-1 bg-soft-cloud rounded-full text-sm">
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(item.total_monthly_leak)}
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={item.overall_score} />
                      </TableCell>
                      <TableCell className="font-mono">{item.subscription_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-mute">
              <div className="rounded-full bg-soft-cloud p-4 w-fit mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-mute" />
              </div>
              <p className="font-medium mb-1">No analyses yet</p>
              <p className="text-sm">Upload your first bank statement to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
