import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface SpendingTrend {
  month: string;
  amount: number;
}

export function useSpendingTrend() {
  return useQuery({
    queryKey: ["spending-trend"],
    queryFn: async () => {
      const res = await api.get<{ trend: SpendingTrend[] }>("/api/user/spending-trend");
      return res.data.trend;
    },
  });
}
