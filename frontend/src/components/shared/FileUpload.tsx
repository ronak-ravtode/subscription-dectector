import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
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
            "relative flex flex-col items-center justify-center rounded-none border-2 border-dashed p-16 text-center transition-all duration-150 cursor-pointer group",
            isDragActive
              ? "border-ink bg-soft-cloud"
              : "border-hairline hover:border-ink/50 hover:bg-soft-cloud/50"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            "mb-6 rounded-full p-4 transition-all duration-150",
            isDragActive
              ? "bg-ink/10"
              : "bg-soft-cloud group-hover:bg-ink/5"
          )}>
            <Upload className={cn(
              "h-10 w-10 transition-colors duration-150",
              isDragActive ? "text-ink" : "text-mute group-hover:text-ink"
            )} />
          </div>
          <p className="text-lg font-medium mb-1">
            {isDragActive
              ? "Drop your PDF here"
              : "Drag & drop your bank statement"}
          </p>
          <p className="text-sm text-mute mb-4">
            PDF files up to 10MB
          </p>
          <Button variant="outline" size="sm" className="pointer-events-none rounded-full">
            <Upload className="h-4 w-4 mr-2" />
            Browse Files
          </Button>
        </div>
      ) : (
        <div className="rounded-none border border-hairline p-6 bg-canvas">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-full bg-soft-cloud p-3">
                <FileText className="h-8 w-8 text-ink" />
              </div>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-mute">
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
            <div className="mt-6 space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <p className="text-mute">
                  Analyzing your statement...
                </p>
                <p className="font-medium text-ink">{progress}%</p>
              </div>
            </div>
          )}
          {!isLoading && (
            <Button className="mt-6 w-full" size="lg" onClick={handleSubmit}>
              <CheckCircle className="h-5 w-5 mr-2" />
              Analyze Statement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
