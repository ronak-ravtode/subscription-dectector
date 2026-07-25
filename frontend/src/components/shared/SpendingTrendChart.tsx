import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface SpendingTrendChartProps {
  data: { month: string; amount: number }[];
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col h-[300px] items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary mb-4">
          <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground font-medium">No spending data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Leak"]}
          labelFormatter={(label: any) => {
            const str = String(label);
            const [year, month] = str.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }}
          contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--popover))' }}
          itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
