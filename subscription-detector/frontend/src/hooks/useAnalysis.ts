import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Analysis } from "@/lib/types";

export function useAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const res = await api.get<Analysis>(`/api/analysis/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
