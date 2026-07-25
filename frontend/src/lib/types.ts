export interface User {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: string;
  is_recurring: boolean;
}

export interface Warning {
  type: "parser" | "quality" | "suggestion";
  message: string;
}

export interface Comparison {
  previous_analysis_id: string;
  previous_date: string;
  new_subscriptions: string[];
  removed_subscriptions: string[];
  price_changes: Array<{merchant: string; old_amount: number; new_amount: number}>;
  score_change: number;
}

export type Frequency = "weekly" | "monthly" | "quarterly" | "annual";
export type PriceTrend = "stable" | "increased" | "decreased";
export type Action = "keep" | "review" | "downgrade" | "renegotiate" | "cancel";

export interface Subscription {
  id: string;
  merchant: string;
  amount: number;
  frequency: Frequency;
  category: string;
  leak_score: number;
  action: Action;
  reasoning: string;
  price_trend: PriceTrend;
  duration_months: number;
  price_increases: number;
}

export interface Analysis {
  analysis_id: string;
  status: "processing" | "complete" | "error";
  total_monthly_leak: number;
  overall_score: number;
  subscriptions: Subscription[];
  transactions: Transaction[];
  ai_summary: string | null;
  recommendations_summary: Record<Action, number>;
  warnings: Warning[];
  comparison: Comparison | null;
  created_at: string;
}

export interface Summary {
  total_monthly_leak: number;
  total_annual_leak: number;
  subscription_count: number;
  high_risk_count: number;
  potential_savings: number;
}

export interface HistoryItem {
  analysis_id: string;
  status: string;
  total_monthly_leak: number;
  overall_score: number;
  subscription_count: number;
  created_at: string;
}

export interface UserSettings {
  notification_email: boolean;
  currency: string;
  theme: string;
}

export interface PaginatedHistory {
  analyses: HistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SpendingTrend {
  month: string;
  amount: number;
}
