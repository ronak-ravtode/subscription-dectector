import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface EmailStatus {
  connected: boolean;
  email?: string;
  last_scan?: string;
  emails_scanned: number;
  subscriptions_detected: number;
}

export function useEmailStatus() {
  return useQuery({
    queryKey: ["email-status"],
    queryFn: async () => {
      const res = await api.get<EmailStatus>("/api/user/email/status");
      return res.data;
    },
  });
}
