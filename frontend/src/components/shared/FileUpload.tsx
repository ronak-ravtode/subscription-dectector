import { useCallback, useState, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { 
  CloudUpload, 
  FileText, 
  FileCheck, 
  Lock, 
  File, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Sparkles,
  Search,
  Store,
  CreditCard,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { AxiosError } from "axios";

interface FileUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
  progress?: number;
  isSuccess?: boolean;
  isError?: boolean;
  error?: AxiosError<{ detail?: string }> | Error | null;
  reset?: () => void;
}

export function FileUpload({ 
  onUpload, 
  isLoading, 
  progress, 
  isSuccess, 
  isError, 
  error,
  reset 
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [aiStage, setAiStage] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  // Cycle through simulated AI stages when processing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && progress === 100) {
      interval = setInterval(() => {
        setAiStage(prev => (prev < 3 ? prev + 1 : prev));
      }, 1500);
    } else {
      setAiStage(0);
    }
    return () => clearInterval(interval);
  }, [isLoading, progress]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setLocalError(null);
      if (fileRejections.length > 0) {
        setLocalError(fileRejections[0].errors[0].message);
        return;
      }
      const selected = acceptedFiles[0];
      if (selected) {
        setFile(selected);
        onUpload(selected);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
    disabled: isLoading || isSuccess,
  });

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setLocalError(null);
    if (reset) reset();
  };

  // State calculations
  const showIdle = !file && !isError && !isSuccess && !localError;
  const currentProgress = progress ?? 0;
  const showUploading = file && isLoading && currentProgress < 100;
  const showProcessing = file && isLoading && currentProgress === 100;
  const showCompleted = isSuccess;
  const showError = isError || localError !== null;

  const errorMessage = localError || 
    ((error as AxiosError<{ detail?: string }>)?.response?.data?.detail) || 
    (error as Error)?.message || 
    "Something went wrong. Please try again.";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full max-w-[800px] mx-auto relative group"
    >
      {/* Background Breathing Glow (Idle State only) */}
      {showIdle && !isDragActive && (
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-accent blur-[100px] rounded-[28px] -z-10 transition-opacity duration-300 group-hover:opacity-40"
        />
      )}

      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full rounded-[28px] border-[2px] p-8 md:p-14 bg-card overflow-hidden transition-all duration-300",
          // Dragging State
          isDragActive && "border-accent bg-accent/5",
          // Hover State
          !isDragActive && showIdle && "border-border border-dashed hover:border-accent/50 hover:shadow-[0_20px_60px_rgba(37,99,235,0.08)] shadow-sm hover:-translate-y-1",
          // Active/Error States
          (isLoading || showCompleted) && "border-solid border-border shadow-sm cursor-default",
          showError && "border-solid border-destructive/30 shadow-sm cursor-default"
        )}
      >
        <input {...getInputProps()} />

        {/* Dragging Scanner Animation */}
        {isDragActive && (
          <motion.div 
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-[2px] bg-accent/40 shadow-[0_0_20px_5px_rgba(37,99,235,0.2)] z-0"
          />
        )}

        <AnimatePresence mode="wait">
          {/* STATE: IDLE & DRAGGING */}
          {showIdle && (
            <motion.div
              key="state-idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center w-full relative z-10 pointer-events-none"
            >
              <motion.div 
                className={cn(
                  "h-24 w-24 rounded-full flex items-center justify-center mb-6 transition-colors duration-300",
                  isDragActive ? "bg-accent/20" : "bg-accent/10 group-hover:bg-accent/20"
                )}
                animate={{ y: isDragActive ? -10 : 0 }}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
              >
                <CloudUpload className="h-10 w-10 text-accent" />
              </motion.div>
              
              <h3 className="text-[24px] md:text-[28px] font-bold text-foreground mb-2 tracking-tight">
                {isDragActive ? "Release to Upload" : "Drag & Drop Your Bank Statement"}
              </h3>
              {!isDragActive && (
                <p className="text-accent font-semibold text-[16px] mb-10 group-hover:underline">
                  or click to browse
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-[14px] font-medium w-full max-w-lg mb-8">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 opacity-70" />
                  <span>PDF only</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-border" />
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 opacity-70" />
                  <span>Max 10 MB</span>
                </div>
              </div>

              <div className="w-full border-t border-border/50 pt-6 flex flex-wrap justify-center gap-8 text-[14px] font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 opacity-70" />
                  <span>Secure Upload</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 opacity-70" />
                  <span>Bank-grade Encryption</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE: UPLOADING */}
          {showUploading && (
            <motion.div
              key="state-uploading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center w-full max-w-md py-6 relative z-10"
            >
              <div className="bg-accent/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
                <FileText className="h-8 w-8 text-accent" />
              </div>
              
              <h3 className="text-[20px] font-bold text-foreground mb-1 truncate w-full px-4">
                {file.name}
              </h3>
              <p className="text-muted-foreground font-medium text-[15px] mb-8">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <div className="w-full space-y-3">
                <div className="flex justify-between text-[14px] font-bold text-foreground">
                  <span>Uploading...</span>
                  <span className="text-accent">{currentProgress}%</span>
                </div>
                <Progress value={currentProgress} className="h-3 bg-secondary [&>div]:bg-accent" />
              </div>
            </motion.div>
          )}

          {/* STATE: AI PROCESSING */}
          {showProcessing && (
            <motion.div
              key="state-processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center w-full max-w-md py-2 relative z-10"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="bg-purple-500/10 h-20 w-20 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-purple-500/50"
              >
                <Sparkles className="h-8 w-8 text-purple-500" />
              </motion.div>
              
              <h3 className="text-[22px] font-bold text-foreground mb-2">
                AI is analyzing your statement
              </h3>
              
              <div className="flex flex-col items-center mt-6 w-full space-y-3">
                <ProcessingStep active={aiStage >= 0} completed={aiStage > 0} icon={FileCheck} text="PDF Uploaded" />
                <ProcessingStep active={aiStage >= 1} completed={aiStage > 1} icon={Search} text="Transaction Extraction" />
                <ProcessingStep active={aiStage >= 2} completed={aiStage > 2} icon={Store} text="Merchant Detection" />
                <ProcessingStep active={aiStage >= 3} completed={false} icon={CreditCard} text="Subscription Risk Analysis" />
              </div>
            </motion.div>
          )}

          {/* STATE: COMPLETED */}
          {showCompleted && (
            <motion.div
              key="state-completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center w-full max-w-md py-8 relative z-10"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="bg-success/10 h-24 w-24 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="h-12 w-12 text-success" />
              </motion.div>
              
              <h3 className="text-[24px] font-bold text-foreground mb-2">
                Analysis Ready
              </h3>
              <p className="text-muted-foreground text-[16px] max-w-sm leading-relaxed">
                Your subscription report has been generated successfully. Redirecting...
              </p>
            </motion.div>
          )}

          {/* STATE: ERROR */}
          {showError && (
            <motion.div
              key="state-error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center w-full max-w-md py-6 relative z-10"
            >
              <div className="bg-destructive/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
              
              <h3 className="text-[20px] font-bold text-foreground mb-2">
                Upload Failed
              </h3>
              <p className="text-destructive font-medium text-[15px] mb-8 bg-destructive/10 px-4 py-2 rounded-lg border border-destructive/30 w-full text-center">
                {errorMessage}
              </p>

              <button 
                onClick={handleRetry}
                className="flex items-center gap-2 bg-card border border-border text-foreground font-bold px-6 py-3 rounded-xl hover:bg-secondary hover:shadow-sm transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ProcessingStep({ active, completed, icon: Icon, text }: { active: boolean, completed: boolean, icon: LucideIcon, text: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0.4 }}
      animate={{ opacity: active ? 1 : 0.4 }}
      className="flex items-center gap-3 w-full max-w-[280px]"
    >
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
        completed ? "bg-success text-white" : active ? "bg-purple-500 text-white" : "bg-secondary text-muted-foreground"
      )}>
        {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
      </div>
      <span className={cn(
        "text-[15px] font-semibold transition-colors",
        completed ? "text-foreground" : active ? "text-purple-500 animate-pulse" : "text-muted-foreground"
      )}>
        {text}
      </span>
    </motion.div>
  )
}