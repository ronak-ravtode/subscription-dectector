import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <Card className="border border-sale/20 bg-sale/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-sale" />
          Warnings & Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parserWarnings.length > 0 && (
          <div className="rounded-none bg-sale/5 p-3">
            <h4 className="text-sm font-medium text-sale flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              Parser Issues
            </h4>
            <ul className="space-y-1">
              {parserWarnings.map((w, i) => (
                <li key={i} className="text-sm text-sale/80 ml-6">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {qualityWarnings.length > 0 && (
          <div className="rounded-none bg-sale/5 p-3">
            <h4 className="text-sm font-medium text-sale flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Data Quality
            </h4>
            <ul className="space-y-1">
              {qualityWarnings.map((w, i) => (
                <li key={i} className="text-sm text-sale/80 ml-6">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="rounded-none bg-info/5 p-3">
            <h4 className="text-sm font-medium text-info flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions
            </h4>
            <ul className="space-y-1">
              {suggestions.map((w, i) => (
                <li key={i} className="text-sm text-info/80 ml-6">
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
