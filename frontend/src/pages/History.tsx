import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useHistory } from "@/hooks/useHistory";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function History() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useHistory(page, 10);
  const navigate = useNavigate();

  // Generate pagination array like [1, 2, 3] or [1, '...', 4, 5] if needed
  // For simplicity, we can generate a basic array if pages <= 5
  const renderPagination = () => {
    if (!data?.pagination || data.pagination.pages <= 1) return null;
    
    const { pages, page: currentPage } = data.pagination;
    const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);

    return (
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <p className="text-[14px] text-muted-foreground font-medium">
          Page {currentPage} of {pages}
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {pageNumbers.map((num) => (
              <button
                key={num}
                onClick={() => setPage(num)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold transition-all",
                  currentPage === num
                    ? "bg-accent/10 text-accent border border-accent/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <PageWrapper>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="w-full flex flex-col mb-12"
      >
        <h1 className="text-[44px] md:text-[56px] font-bold text-foreground tracking-tight leading-[1.1] mb-5">
          Analysis History
        </h1>
        <p className="text-[18px] text-muted-foreground max-w-2xl">
          Review every completed subscription analysis and revisit previous results.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full bg-card rounded-[24px] border border-border shadow-sm p-6 mb-12"
      >
        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
          </div>
        ) : !data?.analyses || data.analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="bg-secondary h-24 w-24 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
              <FileText className="h-10 w-10 text-muted-foreground/70" />
            </div>
            <h3 className="text-[22px] font-bold text-foreground mb-2">No analysis history available</h3>
            <p className="text-muted-foreground max-w-md text-[16px]">Your completed analyses will appear here after processing a bank statement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[15px] font-semibold text-muted-foreground py-5 pl-4 whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-[15px] font-semibold text-muted-foreground py-5 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-[15px] font-semibold text-muted-foreground py-5 whitespace-nowrap">Monthly Leak</TableHead>
                  <TableHead className="text-[15px] font-semibold text-muted-foreground py-5 whitespace-nowrap">Score</TableHead>
                  <TableHead className="text-[15px] font-semibold text-muted-foreground py-5 whitespace-nowrap">Subscriptions</TableHead>
                  <TableHead className="py-5 pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {data.analyses.map((item) => (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={item.analysis_id} 
                      className="hover:bg-secondary transition-colors group border-b border-border/60 last:border-0 h-[72px]"
                    >
                      <TableCell className="pl-4">
                        <span className="font-medium text-foreground text-[16px]">
                          {formatDate(item.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-[16px] text-muted-foreground">
                          {formatCurrency(item.total_monthly_leak)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={item.overall_score} />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-[16px] text-muted-foreground">
                          {item.subscription_count}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <button
                          onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                          className="text-[15px] font-semibold text-accent hover:text-accent/80 hover:underline transition-all"
                        >
                          View
                        </button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            {renderPagination()}
          </div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
