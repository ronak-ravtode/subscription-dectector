import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Transaction } from "@/lib/types";

interface TransactionTableProps {
  transactions: Transaction[];
}

type SortField = "date" | "amount" | "description";
type SortDir = "asc" | "desc";

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [recurringFilter, setRecurringFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (recurringFilter === "yes") {
      result = result.filter((t) => t.is_recurring);
    } else if (recurringFilter === "no") {
      result = result.filter((t) => !t.is_recurring);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = a.date.localeCompare(b.date);
      } else if (sortField === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortField === "description") {
        cmp = a.description.localeCompare(b.description);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [transactions, search, categoryFilter, recurringFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <Card className="rounded-2xl border-border shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-4 pt-6 px-6 border-b border-border/60">
        <CardTitle className="text-xl font-semibold text-primary">All Transactions ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row gap-4 p-6 bg-secondary/30 border-b border-border/60">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 rounded-xl border-border shadow-sm focus-visible:ring-accent bg-background"
            />
          </div>
          <div className="flex gap-3 sm:w-auto w-full">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 w-full sm:w-[160px] rounded-xl border-border shadow-sm focus:ring-accent bg-background">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-border">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat || "other"}>
                    <span className="capitalize">{cat || "other"}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={recurringFilter} onValueChange={setRecurringFilter}>
              <SelectTrigger className="h-11 w-full sm:w-[140px] rounded-xl border-border shadow-sm focus:ring-accent bg-background">
                <SelectValue placeholder="Recurring" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-border">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Recurring</SelectItem>
                <SelectItem value="no">One-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="max-h-[500px] overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-secondary/80 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead
                  className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors whitespace-nowrap"
                  onClick={() => toggleSort("date")}
                >
                  <div className="flex items-center">Date <SortIcon field="date" /></div>
                </TableHead>
                <TableHead
                  className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort("description")}
                >
                  <div className="flex items-center">Description <SortIcon field="description" /></div>
                </TableHead>
                <TableHead
                  className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider cursor-pointer hover:text-primary transition-colors text-right"
                  onClick={() => toggleSort("amount")}
                >
                  <div className="flex items-center justify-end">Amount <SortIcon field="amount" /></div>
                </TableHead>
                <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="px-6 py-4 font-medium text-muted-foreground text-xs uppercase tracking-wider text-center">Recurring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p>No transactions found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className="border-border/60 hover:bg-secondary/50 transition-colors">
                    <TableCell className="px-6 py-4 font-medium text-muted-foreground whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-foreground font-medium">{t.description}</TableCell>
                    <TableCell className="px-6 py-4 text-right font-semibold text-primary whitespace-nowrap">
                      ${t.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline" className="rounded-full px-2.5 py-0.5 border-none bg-accent/10 text-accent font-medium capitalize whitespace-nowrap">
                        {t.category || "other"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      {t.is_recurring ? (
                        <Badge variant="default" className="rounded-full px-2.5 py-0.5 border-none bg-success/10 text-success hover:bg-success/20 font-medium">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/70 text-sm font-medium">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
