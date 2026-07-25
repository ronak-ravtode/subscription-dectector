import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

function PriceHistorySubDetail({ subscriptionId }: { subscriptionId: string }) {
  const { data: priceHistory, isLoading } = usePriceHistory(subscriptionId);

  if (isLoading) return <Skeleton className="h-[200px]" />;
  if (!priceHistory) return null;

  return (
    <PriceHistoryChart
      snapshots={priceHistory.snapshots}
      monthlyAggregates={priceHistory.monthly_aggregates}
    />
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
      <PageWrapper title="Analysis">
        <div className="space-y-4">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !analysis) {
    return (
      <PageWrapper title="Analysis">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Analysis not found or failed to load.
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analysis Results">
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress
                value={analysis.overall_score}
                className="h-3 flex-1"
              />
              <ScoreBadge score={analysis.overall_score} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Leak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analysis.total_monthly_leak)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analysis.total_monthly_leak * 12)}/year
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.subscriptions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 mb-6">
        <AiSummaryCard analysis={analysis} isLoading={isLoading} />

        <WarningsPanel warnings={analysis.warnings || []} />

        <ComparisonPanel comparison={analysis.comparison ?? undefined} />
      </div>

      {categoryData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={categoryData} />
            </CardContent>
          </Card>
          <CategoryBreakdownTable subscriptions={analysis.subscriptions} />
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.subscriptions.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No subscriptions detected in this analysis.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.subscriptions.map((sub) => (
                  <>
                    <TableRow
                      key={sub.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                    >
                      <TableCell className="font-medium">{sub.merchant}</TableCell>
                      <TableCell>{formatCurrency(sub.amount)}</TableCell>
                      <TableCell className="capitalize">{sub.frequency}</TableCell>
                      <TableCell>
                        <ScoreBadge score={sub.leak_score} />
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={sub.action} />
                      </TableCell>
                    </TableRow>
                    {expandedSubId === sub.id && (
                      <TableRow key={`${sub.id}-expanded`}>
                        <TableCell colSpan={5} className="p-4">
                          <PriceHistorySubDetail subscriptionId={sub.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {analysis.transactions && analysis.transactions.length > 0 && (
        <TransactionTable transactions={analysis.transactions} />
      )}

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => id && exportMutation.mutate(id)}
          disabled={exportMutation.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          {exportMutation.isPending ? "Generating..." : "Download PDF Report"}
        </Button>
      </div>
    </PageWrapper>
  );
}
