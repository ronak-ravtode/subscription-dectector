import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Analysis } from "@/lib/types";

interface AiSummaryCardProps {
  analysis: Analysis | undefined;
  isLoading: boolean;
}

export function AiSummaryCard({ analysis, isLoading }: AiSummaryCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis?.ai_summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Upload more statements for AI-powered insights about your spending patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{analysis.ai_summary}</p>
      </CardContent>
    </Card>
  );
}
