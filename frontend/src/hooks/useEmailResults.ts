import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface EmailResult {
  id: string;
  message_id: string;
  subject: string;
  from_email: string;
  received_date: string | null;
  transactions: Array<{
    date: string;
    amount: string;
    description: string;
  }>;
  is_recurring: boolean;
  merchant_detected: string | null;
  amount_detected: number | null;
  scanned_at: string | null;
}

export function useEmailResults(limit = 20) {
  return useQuery({
    queryKey: ["email-results", limit],
    queryFn: async () => {
      const res = await api.get<EmailResult[]>(`/api/user/email/results?limit=${limit}`);
      return res.data;
    },
  });
}
