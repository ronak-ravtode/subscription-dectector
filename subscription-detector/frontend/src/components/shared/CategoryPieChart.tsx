import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface CategoryPieChartProps {
  data: { category: string; count: number; totalAmount: number }[];
}

// Colors prioritized: Blue, Cyan, Dark Sky Blue, Purple, Pink (matching reference image)
const CHART_COLORS = [
  "#3498DB", // Blue (Priority 1)
  "#20B2AA", // Cyan/Teal (Priority 2)
  "#2B3990", // Dark Sky Blue (Priority 3)
  "#9B59B6", // Purple (Priority 4)
  "#E91E8C", // Pink/Magenta (Priority 5)
  "#1ABC9C", // Turquoise
  "#34495E", // Dark Slate
  "#8E44AD", // Deep Purple
  "#2980B9", // Strong Blue
  "#16A085", // Green Sea
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    category: string;
    totalAmount: number;
    percent: number;
  };
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const colorIndex = data.payload.category ? 0 : 0;
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xl">
        <p className="font-semibold text-gray-800 mb-2">{data.name}</p>
        <div className="space-y-1">
          <p className="text-sm text-gray-500">
            Amount: <span className="font-mono font-medium text-gray-700">₹{data.value.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-500">
            Share: <span className="font-mono font-medium text-gray-700">{(data.payload.percent * 100).toFixed(1)}%</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="font-medium text-gray-500">No subscription data yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload a statement to see your breakdown</p>
        </div>
      </div>
    );
  }

  // Calculate total for center display
  const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-col xl:flex-row items-center gap-6">
        {/* Pie Chart */}
        <div className="relative flex-shrink-0">
          <ResponsiveContainer width={280} height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={115}
                paddingAngle={3}
                dataKey="totalAmount"
                nameKey="category"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => {
                  const isActive = activeIndex === index;
                  return (
                    <Cell
                      key={`cell-${entry.category}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke="#ffffff"
                      strokeWidth={3}
                      style={{
                        cursor: 'pointer',
                        opacity: activeIndex === null || isActive ? 1 : 0.6,
                        transform: isActive ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: 'center center',
                        transition: 'all 0.3s ease',
                        filter: isActive ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' : 'none',
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Display */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white rounded-full w-28 h-28 flex flex-col items-center justify-center shadow-lg border border-gray-100">
              <p className="text-2xl font-bold text-gray-800">
                {activeIndex !== null
                  ? `${((data[activeIndex].totalAmount / totalAmount) * 100).toFixed(1)}%`
                  : '100%'}
              </p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {activeIndex !== null ? data[activeIndex].category : 'OVERALL'}
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full min-w-0">
          <div className="space-y-2">
            {data.map((item, index) => {
              const percent = ((item.totalAmount / totalAmount) * 100).toFixed(1);
              const isActive = activeIndex === index;
              return (
                <div
                  key={item.category}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gray-100 shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {/* Color Dot */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      transform: isActive ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: isActive ? `0 2px 8px ${CHART_COLORS[index % CHART_COLORS.length]}60` : 'none',
                    }}
                  />
                  {/* Category Name */}
                  <span className={`text-sm font-medium truncate transition-colors duration-200 ${
                    isActive ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {item.category}
                  </span>
                  {/* Spacer */}
                  <div className="flex-1" />
                  {/* Percentage */}
                  <span className={`text-sm font-mono font-semibold flex-shrink-0 transition-colors duration-200 ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Total Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total Monthly</span>
              <span className="text-lg font-bold text-gray-800 font-mono">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
