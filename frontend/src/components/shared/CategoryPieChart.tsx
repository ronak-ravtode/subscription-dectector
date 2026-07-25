import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Wallet } from "lucide-react";
import { motion } from "framer-motion";

interface CategoryPieChartProps {
  data: { category: string; count: number; totalAmount: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  entertainment: "hsl(var(--primary))",
  software: "hsl(var(--success))",
  finance: "hsl(var(--warning))",
  other: "hsl(var(--accent))",
};

const DEFAULT_COLOR = "hsl(var(--muted-foreground))";

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col h-[300px] items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary mb-4">
          <Wallet className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground font-medium">No subscription data yet</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.5 }}
      className="w-full h-full min-h-[300px]"
    >
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
            {data.map((entry, index) => {
              const color = CATEGORY_COLORS[entry.category.toLowerCase()] || DEFAULT_COLOR;
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={color}
                  className="hover:opacity-85 transition-opacity duration-300 outline-none"
                  style={{ filter: `drop-shadow(0px 4px 10px ${color}40)` }}
                />
              );
            })}
          </Pie>
          <Tooltip
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Monthly Amount"]}
            contentStyle={{ 
              borderRadius: '16px', 
              border: '1px solid hsl(var(--border))', 
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
              padding: '12px 16px',
              backgroundColor: 'hsl(var(--popover))',
            }}
            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            labelStyle={{ color: 'hsl(var(--muted-foreground))', fontWeight: 500, marginBottom: '4px', textTransform: 'capitalize' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '14px', color: 'hsl(var(--muted-foreground))', paddingTop: '20px', textTransform: 'capitalize' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
