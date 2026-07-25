import { useState, useEffect } from "react";
import { useUpload } from "@/hooks/useUpload";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FileUpload } from "@/components/shared/FileUpload";

export default function Upload() {
  const [progress, setProgress] = useState(0);
  const uploadMutation = useUpload();

  useEffect(() => {
    const handleProgress = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProgress(customEvent.detail.progress);
    };
    window.addEventListener("upload-progress", handleProgress);
    return () => window.removeEventListener("upload-progress", handleProgress);
  }, []);

  const handleUpload = (file: File) => {
    setProgress(0);
    uploadMutation.mutate(file, {
      onSettled: () => {
        setProgress(100);
      },
    });
  };

  return (
    <PageWrapper title="Upload Statement">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-muted-foreground text-center">
          Upload your bank statement PDF to detect subscription leaks and get
          personalized recommendations.
        </p>
        <FileUpload
          onUpload={handleUpload}
          isLoading={uploadMutation.isPending}
          progress={progress}
        />
        {uploadMutation.isError && (
          <p className="mt-4 text-sm text-destructive text-center">
            {(uploadMutation.error as any)?.response?.data?.detail ||
              "Upload failed. Please try again."}
          </p>
        )}
      </div>
    </PageWrapper>
  );
}
