import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wallet } from "lucide-react";

interface CategoryPieChartProps {
  data: { category: string; count: number; totalAmount: number }[];
}

const COLORS = [
  "#2563EB", // Accent (Blue)
  "#22C55E", // Success (Green)
  "#F59E0B", // Warning (Orange)
  "#8B5CF6", // Purple
  "#EF4444", // Danger (Red)
  "#06B6D4", // Cyan
  "#EC4899", // Pink
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col h-[300px] items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 mb-4">
          <Wallet className="h-10 w-10 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No subscription data yet</p>
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
          innerRadius={80}
          outerRadius={110}
          paddingAngle={2}
          dataKey="totalAmount"
          nameKey="category"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              className="hover:opacity-80 transition-opacity duration-300 outline-none"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Amount"]}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
          itemStyle={{ color: '#0F172A', fontWeight: 500 }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle"
          wrapperStyle={{ fontSize: '14px', color: '#64748B', paddingTop: '20px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
