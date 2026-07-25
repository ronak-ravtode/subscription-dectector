import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Summary } from "@/lib/types";

export function useSummary() {
  return useQuery({
    queryKey: ["summary"],
    queryFn: async () => {
      const res = await api.get<Summary>("/api/summary");
      return res.data;
    },
  });
}
