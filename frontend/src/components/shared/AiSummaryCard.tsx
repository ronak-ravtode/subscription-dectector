import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import type { Analysis } from "@/lib/types";

interface AiSummaryCardProps {
  analysis: Analysis | undefined;
  isLoading: boolean;
}

export function AiSummaryCard({ analysis, isLoading }: AiSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl border-accent/20 bg-accent/[0.02] shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <CardTitle className="text-lg font-semibold text-primary">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2 ml-[52px]">
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis?.ai_summary) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6 space-y-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg font-semibold text-primary">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2 ml-[52px]">
          <p className="text-muted-foreground text-base leading-relaxed">
            Upload more statements for AI-powered insights about your spending patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-accent/20 bg-accent/[0.02] shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 pb-2 pt-6 px-6 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <CardTitle className="text-lg font-semibold text-primary">AI Insights</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2 ml-[52px]">
        <p className="text-base text-foreground leading-relaxed font-medium">{analysis.ai_summary}</p>
      </CardContent>
    </Card>
  );
}
