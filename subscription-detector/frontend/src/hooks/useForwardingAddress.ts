import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface ForwardingAddressData {
  forwarding_address: string;
  instructions: string;
}

export function useForwardingAddress() {
  return useQuery({
    queryKey: ["forwarding-address"],
    queryFn: async () => {
      const res = await api.get<ForwardingAddressData>("/api/user/forwarding-address");
      return res.data;
    },
  });
}
