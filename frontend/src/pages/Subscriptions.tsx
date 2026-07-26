import { useState, useMemo } from "react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { ActionBadge } from "@/components/shared/ActionBadge";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { PriceHistoryChart } from "@/components/shared/PriceHistoryChart";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Subscription } from "@/lib/types";
import { Search, CreditCard } from "lucide-react";

function PriceHistoryDialog({ subscriptionId }: { subscriptionId: string }) {
  const { data: priceHistory, isLoading } = usePriceHistory(subscriptionId);

  if (isLoading) return <Skeleton className="h-[200px]" />;
  if (!priceHistory) return <p className="text-mute text-center py-4">No price history available.</p>;

  return (
    <PriceHistoryChart
      snapshots={priceHistory.snapshots}
      monthlyAggregates={priceHistory.monthly_aggregates}
    />
  );
}

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Subscription>("leak_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (!subscriptions) return [];
    let result = subscriptions;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.merchant.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    if (actionFilter !== "all") {
      result = result.filter((s) => s.action === actionFilter);
    }

    if (frequencyFilter !== "all") {
      result = result.filter((s) => s.frequency === frequencyFilter);
    }

    result = [...result].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [subscriptions, search, actionFilter, frequencyFilter, sortField, sortDir]);

  const handleSort = (field: keyof Subscription) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <PageWrapper title="Subscriptions" description="View and manage all your detected subscriptions.">
      <div className="mb-section">
        <CategoryPieChart data={categoryData} />
      </div>

      <div className="mb-section flex flex-col gap-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <Input
            placeholder="Search by merchant or category..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="keep">Keep</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="downgrade">Downgrade</SelectItem>
            <SelectItem value="renegotiate">Renegotiate</SelectItem>
            <SelectItem value="cancel">Cancel</SelectItem>
          </SelectContent>
        </Select>
        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frequencies</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <div className="border border-hairline overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-soft-cloud">
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors"
                  onClick={() => handleSort("merchant")}
                >
                  Merchant {sortField === "merchant" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors"
                  onClick={() => handleSort("amount")}
                >
                  Amount {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Category</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors"
                  onClick={() => handleSort("leak_score")}
                >
                  Score {sortField === "leak_score" && (sortDir === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-mute">
                    <div className="rounded-full bg-soft-cloud p-4 w-fit mx-auto mb-4">
                      <CreditCard className="h-8 w-8 text-mute" />
                    </div>
                    <p className="font-medium mb-1">No subscriptions found</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-soft-cloud/50 transition-colors">
                    <TableCell
                      className="font-medium cursor-pointer hover:text-ink transition-colors"
                      onClick={() => setSelectedSubId(sub.id)}
                    >
                      {sub.merchant}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{formatCurrency(sub.amount)}</TableCell>
                    <TableCell>
                      <span className="capitalize px-2 py-1 bg-soft-cloud rounded-full text-sm">
                        {sub.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">{sub.category}</TableCell>
                    <TableCell>
                      <ScoreBadge score={sub.leak_score} />
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={sub.action} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selectedSubId} onOpenChange={() => setSelectedSubId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
          </DialogHeader>
          {selectedSubId && <PriceHistoryDialog subscriptionId={selectedSubId} />}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
