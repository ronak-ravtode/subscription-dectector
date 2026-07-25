import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PriceHistoryChartProps {
  snapshots: { date: string; amount: number }[];
  monthlyAggregates: {
    month: string;
    avgAmount: number;
    minAmount: number;
    maxAmount: number;
  }[];
  showAggregates?: boolean;
}

export function PriceHistoryChart({
  snapshots,
  monthlyAggregates,
  showAggregates = true,
}: PriceHistoryChartProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
        First analysis — no price history yet
      </div>
    );
  }

  const chartData = showAggregates
    ? monthlyAggregates.map((agg) => ({
        month: agg.month,
        avg: agg.avgAmount,
        min: agg.minAmount,
        max: agg.maxAmount,
      }))
    : snapshots.map((s) => ({
        date: s.date,
        amount: s.amount,
      }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData as any}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={showAggregates ? "month" : "date"}
          className="text-xs"
          tickFormatter={(value) => {
            if (showAggregates) {
              const [year, month] = value.split("-");
              return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
            }
            return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, showAggregates ? "Avg Price" : "Price"]}
        />
        {showAggregates ? (
          <>
            <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} dot={false} name="Average" />
            <Line type="monotone" dataKey="min" stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Min" />
            <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Max" />
            <Legend />
          </>
        ) : (
          <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6" }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
