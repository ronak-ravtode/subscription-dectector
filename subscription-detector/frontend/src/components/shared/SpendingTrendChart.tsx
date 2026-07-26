import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface SpendingTrendChartProps {
  data: { month: string; amount: number }[];
}

// Primary chart color - vibrant indigo
const CHART_PRIMARY = "#6366F1";
const CHART_PRIMARY_LIGHT = "#818CF8";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const [year, month] = label.split("-");
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    return (
      <div className="rounded-lg border border-hairline bg-canvas p-3 shadow-lg">
        <p className="font-medium text-sm mb-1">{monthName}</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_PRIMARY }} />
          <p className="text-sm font-mono font-semibold" style={{ color: CHART_PRIMARY }}>
            ₹{Number(payload[0].value).toFixed(2)}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-mute bg-soft-cloud rounded-lg">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="month"
          className="text-xs"
          tickFormatter={(value) => {
            const [year, month] = value.split("-");
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
          }}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis
          className="text-xs"
          tickFormatter={(value) => `₹${value}`}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={CHART_PRIMARY}
          strokeWidth={2.5}
          fillOpacity={1}
          fill="url(#spendingGradient)"
          dot={{ fill: CHART_PRIMARY, strokeWidth: 2, r: 4, stroke: "#fff" }}
          activeDot={{ r: 7, stroke: CHART_PRIMARY, strokeWidth: 2, fill: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
