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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">All Transactions ({transactions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
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

        <div className="rounded-md border max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("date")}
                >
                  Date <SortIcon field="date" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("description")}
                >
                  Description <SortIcon field="description" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted text-right"
                  onClick={() => toggleSort("amount")}
                >
                  Amount <SortIcon field="amount" />
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Recurring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(t.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${t.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t.category || "other"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.is_recurring ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">No</span>
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
