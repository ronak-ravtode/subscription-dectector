import { useState, useEffect } from "react";
import { useUpload } from "@/hooks/useUpload";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { FileUpload } from "@/components/shared/FileUpload";
import { 
  FileCheck, 
  Search, 
  Store, 
  CreditCard, 
  Brain, 
  BarChart,
  Search as SearchIcon,
  PieChart,
  BrainCircuit,
  Lightbulb,
  Shield,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

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

  const pipelineSteps = [
    { icon: FileCheck, title: "PDF Upload", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/20" },
    { icon: Search, title: "Transaction Extraction", color: "text-accent", bg: "bg-accent/10" },
    { icon: Store, title: "Merchant Detection", color: "text-success", bg: "bg-success/10" },
    { icon: CreditCard, title: "Subscription Detection", color: "text-accent", bg: "bg-accent/10" },
    { icon: Brain, title: "AI Risk Analysis", color: "text-accent", bg: "bg-accent/10" },
    { icon: BarChart, title: "Personalized Recommendations", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/20" },
  ];

  const features = [
    {
      icon: SearchIcon,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/20",
      title: "Hidden Subscription Detection",
      description: "Find forgotten recurring subscriptions."
    },
    {
      icon: PieChart,
      color: "text-success",
      bg: "bg-success/10",
      title: "Monthly & Annual Leak Analysis",
      description: "Calculate your recurring expenses."
    },
    {
      icon: BrainCircuit,
      color: "text-accent",
      bg: "bg-accent/10",
      title: "AI Spending Intelligence",
      description: "Understand recurring spending behavior."
    },
    {
      icon: Lightbulb,
      color: "text-warning",
      bg: "bg-warning/10",
      title: "Smart Recommendations",
      description: "Receive actionable savings suggestions."
    }
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col items-center w-full pb-16">
        
        {/* HERO SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mt-12 mb-16 px-4"
        >
          <h1 className="text-[56px] md:text-[72px] font-extrabold text-foreground uppercase tracking-tighter leading-[1.05] mb-4">
            Upload Your<br/>Statement
          </h1>
          <h2 className="text-[20px] md:text-[22px] font-bold text-accent mb-8">
            AI-powered subscription intelligence
          </h2>
          <p className="text-[16px] md:text-[18px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop paying for forgotten subscriptions.<br className="hidden md:block"/>
            Upload your bank statement and let AI detect recurring payments, 
            hidden renewals, subscription leaks, and spending patterns in seconds.
          </p>
        </motion.div>

        {/* UPLOAD CARD */}
        <div className="w-full px-4 mb-24 relative z-10">
          <FileUpload
            onUpload={handleUpload}
            isLoading={uploadMutation.isPending}
            progress={progress}
            isSuccess={uploadMutation.isSuccess}
            isError={uploadMutation.isError}
            error={uploadMutation.error}
            reset={() => {
              uploadMutation.reset();
              setProgress(0);
            }}
          />
        </div>

        {/* AI PROCESSING PIPELINE */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[1200px] px-4 mb-32"
        >
          <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-4 md:gap-0">
            {pipelineSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center text-center w-[160px] group">
                    <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center mb-4 transition-transform group-hover:-translate-y-1 group-hover:shadow-md border border-border bg-card`}>
                      <Icon className={`w-7 h-7 ${step.color}`} />
                    </div>
                    <div className="text-[14px] font-bold text-accent mb-1">{index + 1}</div>
                    <div className="text-[14px] font-semibold text-foreground leading-tight px-2">
                      {step.title}
                    </div>
                  </div>
                  {index < pipelineSteps.length - 1 && (
                    <div className="hidden md:flex items-center text-muted-foreground px-2 opacity-50">
                      <div className="w-8 h-[2px] bg-border" />
                      <ArrowRight className="w-4 h-4 -ml-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* WHY SUBGUARD FEATURES */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[1200px] px-4 mb-24"
        >
          <h3 className="text-[24px] font-bold text-foreground mb-8">Why SubGuard?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={idx}
                  className="bg-card rounded-[20px] p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-full ${feature.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h4 className="text-[18px] font-bold text-foreground mb-2 leading-tight">
                    {feature.title}
                  </h4>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* SECURITY NOTICE */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4"
        >
          <Shield className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
          <p className="text-[14px] text-muted-foreground font-medium leading-relaxed">
            Your statement is encrypted during upload and securely processed.<br/>
            Files are never shared with third parties.
          </p>
        </motion.div>

      </div>
    </PageWrapper>
  );
}
