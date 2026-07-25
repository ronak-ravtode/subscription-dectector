import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CategoryPieChartProps {
  data: { category: string; count: number; totalAmount: number }[];
}

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No subscription data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ category, percent }: any) =>
            `${category} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={100}
          fill="#8884d8"
          dataKey="totalAmount"
          nameKey="category"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Amount"]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
