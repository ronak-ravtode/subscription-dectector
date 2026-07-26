import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TrendsData {
  status: string;
  category_totals: Record<string, number>;
  monthly_leak_history: Array<{
    analysis_id: string;
    date: string;
    monthly_leak: number;
    overall_score: number;
  }>;
  analysis_count: number;
}

export function SpendingTrends() {
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v2/spending-trends")
      .then((res) => res.json())
      .then((data) => {
        setTrends(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageWrapper
      title="Spending Trends & Analytics"
      description="Monitor monthly subscription leaks, category distribution, and report exports."
    >
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => window.open("/api/v2/admin/health", "_blank")}
          >
            System Health Probe
          </Button>
        </div>

        {loading ? (
          <div>Loading analytics...</div>
        ) : !trends ? (
          <div>Failed to load spending trends.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(trends.category_totals).length === 0 ? (
                    <p className="text-muted-foreground text-sm">No categorical subscriptions detected yet.</p>
                  ) : (
                    Object.entries(trends.category_totals).map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center border-b pb-2">
                        <span className="capitalize font-medium">{category}</span>
                        <span className="font-semibold text-primary">₹{amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Leak History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {trends.monthly_leak_history.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No historical analyses found.</p>
                  ) : (
                    trends.monthly_leak_history.map((item) => (
                      <div key={item.analysis_id} className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Score: {item.overall_score}</span>
                          <span className="font-semibold text-destructive">₹{item.monthly_leak.toFixed(2)}/mo</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

export default SpendingTrends;
