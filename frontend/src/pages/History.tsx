import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "@/hooks/useHistory";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, History as HistoryIcon, Eye } from "lucide-react";

export default function History() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistory(page, 10);
  const navigate = useNavigate();

  return (
    <PageWrapper title="Analysis History" description="View all your past analyses and track changes over time.">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <>
          <div className="border border-hairline overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-soft-cloud">
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Leak</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Subscriptions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.analyses || data.analyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-mute">
                      <div className="rounded-full bg-soft-cloud p-4 w-fit mx-auto mb-4">
                        <HistoryIcon className="h-8 w-8 text-mute" />
                      </div>
                      <p className="font-medium mb-1">No analyses found</p>
                      <p className="text-sm">Upload your first bank statement to get started.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.analyses.map((item) => (
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="mt-section flex items-center justify-between">
              <p className="text-sm text-mute">
                Page {data.pagination.page} of {data.pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
