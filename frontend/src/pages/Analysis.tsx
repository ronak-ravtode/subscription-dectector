import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAnalysis } from "@/hooks/useAnalysis";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useExportPdf } from "@/hooks/useExportPdf";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { ActionBadge } from "@/components/shared/ActionBadge";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { PriceHistoryChart } from "@/components/shared/PriceHistoryChart";
import { AiSummaryCard } from "@/components/shared/AiSummaryCard";
import { WarningsPanel } from "@/components/shared/WarningsPanel";
import { ComparisonPanel } from "@/components/shared/ComparisonPanel";
import { TransactionTable } from "@/components/shared/TransactionTable";
import { CategoryBreakdownTable } from "@/components/shared/CategoryBreakdownTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, Package, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function PriceHistorySubDetail({ subscriptionId }: { subscriptionId: string }) {
  const { data: priceHistory, isLoading } = usePriceHistory(subscriptionId);

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl m-4" />;
  if (!priceHistory) return null;

  return (
    <div className="p-4 bg-secondary/50 rounded-xl m-4 border border-border/60 shadow-inner">
      <PriceHistoryChart
        snapshots={priceHistory.snapshots}
        monthlyAggregates={priceHistory.monthly_aggregates}
      />
    </div>
  );
}

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const { data: analysis, isLoading, error } = useAnalysis(id);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const exportMutation = useExportPdf();

  const categoryData = useMemo(() => {
    if (!analysis?.subscriptions) return [];
    const grouped = analysis.subscriptions.reduce((acc, sub) => {
      const cat = sub.category || "other";
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, totalAmount: 0 };
      acc[cat].count++;
      acc[cat].totalAmount += sub.amount;
      return acc;
    }, {} as Record<string, { category: string; count: number; totalAmount: number }>);
    return Object.values(grouped);
  }, [analysis]);

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <Skeleton className="h-[140px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !analysis) {
    return (
      <PageWrapper>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Analysis not found or failed to load.
            </p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analysis Results">
      <p className="mb-10 text-muted-foreground text-base md:text-lg">
        Your subscription analysis overview
      </p>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-base font-medium text-muted-foreground">Overall Score</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-4xl font-bold text-primary tracking-tight">{analysis.overall_score}</span>
              <span className="text-sm font-medium text-muted-foreground">/100</span>
            </div>
            <Progress
              value={analysis.overall_score}
              className="h-2 w-full bg-secondary"
              indicatorClassName={
                analysis.overall_score <= 30 ? "bg-success" :
                analysis.overall_score <= 60 ? "bg-warning" :
                analysis.overall_score <= 80 ? "bg-orange-500" :
                "bg-danger"
              }
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-base font-medium text-muted-foreground">Monthly Leak</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <div className="text-4xl font-bold text-primary tracking-tight">
              {formatCurrency(analysis.total_monthly_leak)}
            </div>
            <p className="mt-2 text-sm font-medium text-success">
              {formatCurrency(analysis.total_monthly_leak * 12)}/year
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6 pt-6">
            <CardTitle className="text-base font-medium text-muted-foreground">Subscriptions Found</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <div className="text-4xl font-bold text-primary tracking-tight">
              {analysis.subscriptions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 mb-8">
        <AiSummaryCard analysis={analysis} isLoading={isLoading} />
        <WarningsPanel warnings={analysis.warnings || []} />
        <ComparisonPanel comparison={analysis.comparison ?? undefined} />
      </div>

      {categoryData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xl font-semibold text-primary">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <CategoryPieChart data={categoryData} />
            </CardContent>
          </Card>
          <CategoryBreakdownTable subscriptions={analysis.subscriptions} />
        </div>
      )}

      <Card className="mb-8 rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
        <CardHeader className="pb-4 pt-6 px-6 border-b border-border/60">
          <CardTitle className="text-xl font-semibold text-primary">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {analysis.subscriptions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-center text-muted-foreground font-medium">
                No subscriptions detected in this analysis.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Merchant</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Frequency</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Score</TableHead>
                  <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.subscriptions.map((sub) => (
                  <React.Fragment key={sub.id}>
                    <TableRow
                      className="cursor-pointer border-border/60 hover:bg-secondary/80 transition-colors"
                      onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                    >
                      <TableCell className="px-6 py-4 font-semibold text-foreground">{sub.merchant}</TableCell>
                      <TableCell className="px-6 py-4 font-medium text-primary">{formatCurrency(sub.amount)}</TableCell>
                      <TableCell className="px-6 py-4 capitalize text-muted-foreground">{sub.frequency}</TableCell>
                      <TableCell className="px-6 py-4">
                        <ScoreBadge score={sub.leak_score} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <ActionBadge action={sub.action} />
                      </TableCell>
                    </TableRow>
                    {expandedSubId === sub.id && (
                      <TableRow className="border-border/60 bg-secondary/30 hover:bg-secondary/30">
                        <TableCell colSpan={5} className="p-0">
                          <PriceHistorySubDetail subscriptionId={sub.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {analysis.transactions && analysis.transactions.length > 0 && (
        <TransactionTable transactions={analysis.transactions} />
      )}

      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => id && exportMutation.mutate(id)}
          disabled={exportMutation.isPending}
          className="h-11 px-6 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 bg-primary text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {exportMutation.isPending ? "Generating..." : "Download PDF Report"}
        </Button>
      </div>
    </PageWrapper>
  );
}
