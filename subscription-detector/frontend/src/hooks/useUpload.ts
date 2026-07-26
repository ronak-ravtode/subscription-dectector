import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface UploadResponse {
  analysis_id: string;
  status: string;
  message: string;
  created_at: string;
}

export function useUpload() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<UploadResponse>("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            window.dispatchEvent(
              new CustomEvent("upload-progress", {
                detail: { progress: percentCompleted },
              })
            );
          }
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      navigate(`/analysis/${data.analysis_id}`);
    },
  });
}
