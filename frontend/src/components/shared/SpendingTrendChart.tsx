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
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 mb-4">
          <TrendingUp className="h-10 w-10 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No spending data yet</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
          }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Leak"]}
          labelFormatter={(label: any) => {
            const str = String(label);
            const [year, month] = str.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
          }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
          itemStyle={{ color: '#0F172A', fontWeight: 600 }}
          labelStyle={{ color: '#64748B', marginBottom: '4px' }}
        />
        <Line
          type="monotone"
          dataKey="amount"
          stroke="#2563EB"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6, fill: "#2563EB", stroke: "#FFFFFF", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
