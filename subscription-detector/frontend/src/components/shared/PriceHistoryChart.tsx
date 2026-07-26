import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
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

// Distinct colors for each metric
const COLORS = {
  avg: "#6366F1",   // Indigo - Average
  min: "#10B981",   // Emerald - Minimum
  max: "#F43F5E",   // Rose - Maximum
  amount: "#8B5CF6", // Violet - Single value
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-hairline bg-canvas p-3 shadow-lg">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-mute">{entry.name}:</span>
            <span className="text-xs font-mono font-semibold" style={{ color: entry.color }}>
              ₹{Number(entry.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-4 mt-3">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-mute">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function PriceHistoryChart({
  snapshots,
  monthlyAggregates,
  showAggregates = true,
}: PriceHistoryChartProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-mute text-sm bg-soft-cloud rounded-lg">
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
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData as any} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceAvgGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.avg} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.avg} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="priceAmountGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.amount} stopOpacity={0.25} />
            <stop offset="95%" stopColor={COLORS.amount} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
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
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          className="text-xs"
          tickFormatter={(value) => `₹${value}`}
          tickLine={false}
          axisLine={false}
          dx={-8}
        />
        <Tooltip content={<CustomTooltip />} />
        {showAggregates ? (
          <>
            <Area
              type="monotone"
              dataKey="avg"
              stroke={COLORS.avg}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#priceAvgGradient)"
              dot={false}
              name="Average"
            />
            <Line
              type="monotone"
              dataKey="min"
              stroke={COLORS.min}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Min"
            />
            <Line
              type="monotone"
              dataKey="max"
              stroke={COLORS.max}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Max"
            />
            <Legend content={<CustomLegend />} />
          </>
        ) : (
          <Area
            type="monotone"
            dataKey="amount"
            stroke={COLORS.amount}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#priceAmountGradient)"
            dot={{ fill: COLORS.amount, r: 4, strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, stroke: COLORS.amount, strokeWidth: 2, fill: "#fff" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
