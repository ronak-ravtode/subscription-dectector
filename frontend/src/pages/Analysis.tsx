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
import { TransactionTable } from "@/components/shared/TransactionTable";
import { CategoryBreakdownTable } from "@/components/shared/CategoryBreakdownTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, CreditCard, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
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
        <div className="space-y-section">
          <div className="grid gap-sm md:grid-cols-3">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !analysis) {
    return (
      <PageWrapper title="Analysis">
        <Card className="border border-hairline">
          <CardContent className="py-12 text-center text-mute">
            <div className="rounded-full bg-soft-cloud p-4 w-fit mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-mute" />
            </div>
            <p className="font-medium mb-1">Analysis not found</p>
            <p className="text-sm">The analysis you're looking for doesn't exist or failed to load.</p>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Analysis Results">
      <div className="grid gap-sm md:grid-cols-3 mb-section">
        <Card className="border border-hairline">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Overall Score
            </CardTitle>
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
        <Card className="border border-hairline">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute flex items-center gap-2">
              <DollarSign className="h-3 w-3" />
              Monthly Leak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium font-mono tracking-tight">
              {formatCurrency(analysis.total_monthly_leak)}
            </div>
            <p className="text-sm text-mute mt-1">
              {formatCurrency(analysis.total_monthly_leak * 12)}/year
            </p>
          </CardContent>
        </Card>
        <Card className="border border-hairline">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-mute flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              Subscriptions Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium font-mono tracking-tight">
              {analysis.subscriptions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-section mb-section">
        <AiSummaryCard analysis={analysis} isLoading={isLoading} />
        <WarningsPanel warnings={analysis.warnings || []} />
      </div>

      {categoryData.length > 0 && (
        <div className="grid gap-section md:grid-cols-2 mb-section">
          <Card className="border border-hairline">
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

      <Card className="mb-section border border-hairline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-mute" />
            Subscriptions
            <Badge variant="secondary" className="ml-2 font-mono">
              {analysis.subscriptions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.subscriptions.length === 0 ? (
            <div className="text-center py-12 text-mute">
              <div className="rounded-full bg-soft-cloud p-4 w-fit mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-mute" />
              </div>
              <p className="font-medium mb-1">No subscriptions detected</p>
              <p className="text-sm">No subscriptions were found in this analysis.</p>
            </div>
          ) : (
            <div className="border border-hairline overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-soft-cloud">
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
                        className="cursor-pointer hover:bg-soft-cloud/50 transition-colors"
                        onClick={() => setExpandedSubId(expandedSubId === sub.id ? null : sub.id)}
                      >
                        <TableCell className="font-medium flex items-center gap-2">
                          {expandedSubId === sub.id ? (
                            <ChevronUp className="h-4 w-4 text-ink" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-mute" />
                          )}
                          {sub.merchant || "Unknown Merchant"}
                        </TableCell>
                        <TableCell className="font-mono font-medium">{formatCurrency(sub.amount)}</TableCell>
                        <TableCell>
                          <span className="capitalize px-2 py-1 bg-soft-cloud rounded-full text-sm">
                            {sub.frequency}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ScoreBadge score={sub.leak_score} />
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={sub.action} />
                        </TableCell>
                      </TableRow>
                      {expandedSubId === sub.id && (
                        <TableRow key={`${sub.id}-expanded`} className="bg-soft-cloud/30">
                          <TableCell colSpan={5} className="p-4">
                            <PriceHistorySubDetail subscriptionId={sub.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.transactions && analysis.transactions.length > 0 && (
        <TransactionTable transactions={analysis.transactions} />
      )}

      <div className="mt-section flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={async () => {
            if (!id) return;
            try {
              const response = await api.get(`/api/v2/reports/csv?analysis_id=${id}&type=subscriptions`, {
                responseType: "blob",
              });
              const url = window.URL.createObjectURL(response.data);
              const link = document.createElement("a");
              link.href = url;
              link.download = `subscriptions-${id.slice(0, 8)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (err) {
              alert("Failed to download CSV");
            }
          }}
          size="lg"
        >
          <span className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Subscriptions CSV
          </span>
        </Button>

        <Button
          onClick={() => id && exportMutation.mutate(id)}
          disabled={exportMutation.isPending}
          size="lg"
        >
          {exportMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-canvas/30 border-t-canvas rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download PDF Report
            </span>
          )}
        </Button>
      </div>
    </PageWrapper>
  );
}
