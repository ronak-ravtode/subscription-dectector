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
      <Card className="border border-hairline">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis?.ai_summary) {
    return (
      <Card className="border border-hairline">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mute" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mute text-sm leading-relaxed">
            Upload more statements for AI-powered insights about your spending patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-hairline">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-mute" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/80">
          {analysis.ai_summary}
        </p>
      </CardContent>
    </Card>
  );
}
