import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { SmsSettings } from "@/lib/types";

export function useSmsSettings() {
  return useQuery({
    queryKey: ["sms-settings"],
    queryFn: async () => {
      const res = await api.get<SmsSettings>("/api/user/sms-settings");
      return res.data;
    },
  });
}

export function useUpdateSmsSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { phone_number?: string; sms_forwarding_enabled?: boolean }) => {
      const res = await api.put<SmsSettings>("/api/user/sms-settings", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-settings"] });
    },
  });
}
