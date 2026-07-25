import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
  progress?: number;
}

export function FileUpload({ onUpload, isLoading, progress }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selected = acceptedFiles[0];
      if (selected) {
        setFile(selected);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  const handleSubmit = () => {
    if (file) {
      onUpload(file);
    }
  };

  const handleRemove = () => {
    setFile(null);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">
            {isDragActive
              ? "Drop your PDF here"
              : "Drag & drop your bank statement"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            PDF files up to 10MB
          </p>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isLoading && (
              <Button variant="ghost" size="icon" onClick={handleRemove}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isLoading && progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {progress}% - Analyzing your statement...
              </p>
            </div>
          )}
          {!isLoading && (
            <Button className="mt-4 w-full" onClick={handleSubmit}>
              Analyze Statement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}