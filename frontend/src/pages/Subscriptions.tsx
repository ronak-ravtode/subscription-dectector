import { useState, useMemo } from "react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ScoreBadge } from "@/components/shared/ScoreBadge";
import { ActionBadge } from "@/components/shared/ActionBadge";
import { CategoryPieChart } from "@/components/shared/CategoryPieChart";
import { PriceHistoryChart } from "@/components/shared/PriceHistoryChart";
import { MerchantAvatar } from "@/components/shared/MerchantAvatar";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Subscription } from "@/lib/types";
import { Search, Inbox, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function PriceHistoryDialog({ subscriptionId }: { subscriptionId: string }) {
  const { data: priceHistory, isLoading } = usePriceHistory(subscriptionId);

  if (isLoading) return <Skeleton className="h-[200px]" />;
  if (!priceHistory) return <p className="text-muted-foreground">No price history available.</p>;

  return (
    <PriceHistoryChart
      snapshots={priceHistory.snapshots}
      monthlyAggregates={priceHistory.monthly_aggregates}
    />
  );
}

const categoryBadges = [
  { name: "entertainment", label: "Entertainment", color: "bg-accent/10 text-accent" },
  { name: "software", label: "Software", color: "bg-success/10 text-success" },
  { name: "finance", label: "Finance", color: "bg-warning/10 text-warning" },
  { name: "other", label: "Other", color: "bg-purple-500/10 text-purple-500" }
];

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<keyof Subscription>("amount");
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

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof Subscription) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(field);
    }
  };

  const SortIcon = ({ field }: { field: keyof Subscription }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  return (
    <PageWrapper>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4 }}
        className="w-full flex flex-col xl:flex-row gap-10 mb-12 items-center xl:items-start"
      >
        <div className="flex-1 flex flex-col justify-center max-xl:text-center max-xl:items-center xl:pt-10">
          <h1 className="text-[44px] md:text-[56px] font-bold text-foreground tracking-tight leading-[1.1] mb-5">
            Subscriptions
          </h1>
          <p className="text-[18px] text-muted-foreground mb-8 max-w-xl">
            Manage and review all recurring subscriptions detected from your bank statements.
          </p>
          
          <div className="flex flex-wrap gap-3 max-xl:justify-center">
            {categoryBadges.map(b => {
               const catData = categoryData.find(c => c.category.toLowerCase() === b.name);
               const count = catData ? catData.count : 0;
               return (
                 <div key={b.name} className={`px-4 py-2 rounded-full font-bold text-[14px] ${b.color} flex items-center gap-2 shadow-sm border border-border/50`}>
                   {b.label}
                   <span className="bg-background/60 px-2 py-0.5 rounded-full text-[12px]">{count}</span>
                 </div>
               )
            })}
          </div>
        </div>
        
        <div className="w-full max-w-[440px] bg-card rounded-[24px] border border-border shadow-sm p-8">
          <CategoryPieChart data={categoryData} />
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full bg-card rounded-[20px] p-2 border border-border shadow-sm flex flex-col md:flex-row gap-2 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/70" />
          <Input
            placeholder="Search by merchant or category..."
            className="pl-12 h-12 bg-transparent border-none shadow-none focus-visible:ring-0 text-[16px] placeholder:text-muted-foreground/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="w-[1px] bg-border hidden md:block my-2" />
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-12 border-none shadow-none bg-transparent hover:bg-secondary rounded-xl focus:ring-0 w-full sm:w-[160px] font-semibold text-muted-foreground">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-border">
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="keep">Keep</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="downgrade">Downgrade</SelectItem>
              <SelectItem value="renegotiate">Renegotiate</SelectItem>
              <SelectItem value="cancel">Cancel</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="h-12 border-none shadow-none bg-transparent hover:bg-secondary rounded-xl focus:ring-0 w-full sm:w-[160px] font-semibold text-muted-foreground">
              <SelectValue placeholder="Filter by frequency" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-lg border-border">
              <SelectItem value="all">All Frequencies</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full bg-card rounded-[24px] border border-border shadow-sm overflow-hidden mb-12"
      >
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
            <Skeleton className="h-12 w-full rounded-xl bg-secondary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center px-4">
            <div className="bg-secondary h-24 w-24 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
              <Inbox className="h-10 w-10 text-muted-foreground/70" />
            </div>
            <h3 className="text-[22px] font-bold text-foreground mb-2">No subscriptions detected</h3>
            <p className="text-muted-foreground max-w-md text-[16px]">We couldn't find recurring subscriptions matching your filters in your uploaded statement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/50 sticky top-0 backdrop-blur-sm">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:text-foreground text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 pl-8 transition-colors whitespace-nowrap"
                    onClick={() => handleSort("merchant")}
                    onKeyDown={(e) => handleKeyDown(e, "merchant")}
                  >
                    Merchant <SortIcon field="merchant" />
                  </TableHead>
                  <TableHead
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:text-foreground text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 transition-colors whitespace-nowrap"
                    onClick={() => handleSort("amount")}
                    onKeyDown={(e) => handleKeyDown(e, "amount")}
                  >
                    Amount <SortIcon field="amount" />
                  </TableHead>
                  <TableHead className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 whitespace-nowrap">Frequency</TableHead>
                  <TableHead className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 whitespace-nowrap">Category</TableHead>
                  <TableHead
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer hover:text-foreground text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 transition-colors whitespace-nowrap"
                    onClick={() => handleSort("leak_score")}
                    onKeyDown={(e) => handleKeyDown(e, "leak_score")}
                  >
                    Score <SortIcon field="leak_score" />
                  </TableHead>
                  <TableHead className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider py-5 pr-8 whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filtered.map((sub) => (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={sub.id} 
                      onClick={() => setSelectedSubId(sub.id)}
                      className="hover:bg-secondary transition-colors cursor-pointer group border-b border-border/60 last:border-0"
                    >
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-4">
                          <MerchantAvatar name={sub.merchant} />
                          <span className="font-bold text-foreground text-[16px] group-hover:text-accent transition-colors">{sub.merchant}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-bold text-[16px] text-foreground">
                          {formatCurrency(sub.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="capitalize font-medium text-[15px] text-muted-foreground">{sub.frequency}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="capitalize font-medium text-[15px] text-muted-foreground">{sub.category}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <ScoreBadge score={sub.leak_score} />
                      </TableCell>
                      <TableCell className="pr-8 py-4">
                        <ActionBadge action={sub.action} />
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      <Dialog open={!!selectedSubId} onOpenChange={() => setSelectedSubId(null)}>
        <DialogContent className="max-w-2xl rounded-[24px] border-border shadow-lg p-8 bg-card">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-[24px] font-bold text-foreground">Price History</DialogTitle>
          </DialogHeader>
          {selectedSubId && <PriceHistoryDialog subscriptionId={selectedSubId} />}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
