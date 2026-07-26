import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Subscription } from "@/lib/types";

export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await api.get<Subscription[]>("/api/subscriptions");
      return res.data;
    },
  });
}
