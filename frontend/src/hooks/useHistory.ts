import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PaginatedHistory } from "@/lib/types";

export function useHistory(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ["history", page],
    queryFn: async () => {
      const res = await api.get<PaginatedHistory>("/api/user/history", {
        params: { page, limit },
      });
      return res.data;
    },
  });
}
