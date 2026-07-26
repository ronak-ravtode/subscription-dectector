import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface PriceSnapshot {
  date: string;
  amount: number;
}

interface MonthlyAggregate {
  month: string;
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
}

export interface PriceHistoryData {
  subscription_id: string;
  merchant: string;
  snapshots: PriceSnapshot[];
  monthly_aggregates: MonthlyAggregate[];
}

export function usePriceHistory(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["price-history", subscriptionId],
    queryFn: async () => {
      const res = await api.get<PriceHistoryData>(
        `/api/user/subscriptions/${subscriptionId}/price-history`
      );
      return res.data;
    },
    enabled: !!subscriptionId,
  });
}
