import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "@/hooks/useHistory";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function History() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistory(page, 10);
  const navigate = useNavigate();

  return (
    <PageWrapper title="Analysis History">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Leak</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Subscriptions</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.analyses || data.analyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No analyses found.
                  </TableCell>
                </TableRow>
              ) : (
                data.analyses.map((item) => (
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
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
