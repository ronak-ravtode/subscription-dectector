import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";

export function useExportPdf() {
  return useMutation({
    mutationFn: async (analysisId: string) => {
      const response = await api.post(`/api/analysis/${analysisId}/export`, null, {
        responseType: "blob",
      });
      return response.data;
    },
    onSuccess: (data: Blob, analysisId: string) => {
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `subguard-analysis-${analysisId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
