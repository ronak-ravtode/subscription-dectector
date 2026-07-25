import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Lightbulb } from "lucide-react";
import type { Warning } from "@/lib/types";

interface WarningsPanelProps {
  warnings: Warning[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (!warnings || warnings.length === 0) return null;

  const parserWarnings = warnings.filter((w) => w.type === "parser");
  const qualityWarnings = warnings.filter((w) => w.type === "quality");
  const suggestions = warnings.filter((w) => w.type === "suggestion");

  return (
    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Warnings & Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parserWarnings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1 mb-1">
              <AlertCircle className="h-4 w-4" />
              Parser Issues
            </h4>
            {parserWarnings.map((w, i) => (
              <p key={i} className="text-sm text-red-600 dark:text-red-300 ml-5">
                {w.message}
              </p>
            ))}
          </div>
        )}
        {qualityWarnings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4" />
              Data Quality
            </h4>
            {qualityWarnings.map((w, i) => (
              <p key={i} className="text-sm text-yellow-600 dark:text-yellow-300 ml-5">
                {w.message}
              </p>
            ))}
          </div>
        )}
        {suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </h4>
            {suggestions.map((w, i) => (
              <p key={i} className="text-sm text-blue-600 dark:text-blue-300 ml-5">
                {w.message}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
