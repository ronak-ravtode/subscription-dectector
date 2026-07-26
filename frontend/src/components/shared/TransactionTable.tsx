import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  // Reset to page 1 whenever filter parameters change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, recurringFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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
    <Card className="border border-hairline">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-mute" />
          Transaction History
          <Badge variant="secondary" className="ml-2 font-mono">
            {transactions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-mute" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat || "other"}>
                  {cat || "other"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={recurringFilter} onValueChange={setRecurringFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Recurring" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Recurring</SelectItem>
              <SelectItem value="no">One-time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-none border border-hairline overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-soft-cloud">
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors"
                  onClick={() => toggleSort("date")}
                >
                  Date <SortIcon field="date" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors"
                  onClick={() => toggleSort("description")}
                >
                  Description <SortIcon field="description" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-ink transition-colors text-right"
                  onClick={() => toggleSort("amount")}
                >
                  Amount <SortIcon field="amount" />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Recurring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-mute">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((t) => (
                  <TableRow key={t.id} className="hover:bg-soft-cloud/50 transition-colors">
                    <TableCell className="font-mono text-sm">
                      {typeof t.date === "string" ? t.date : new Date(t.date).toISOString().split("T")[0]}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ₹{t.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {t.category || "other"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.is_recurring ? (
                        <Badge variant="info" className="text-xs">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-mute text-xs">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-mute">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full px-4"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full px-4"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
