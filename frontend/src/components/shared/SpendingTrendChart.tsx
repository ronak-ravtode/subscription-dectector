import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpendingTrendChartProps {
  data: { month: string; amount: number }[];
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          className="text-xs"
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
          }}
        />
        <YAxis
          className="text-xs"
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Leak"]}
          labelFormatter={(label: any) => {
            const str = String(label);
            const [year, month] = str.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
