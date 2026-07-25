from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List
from enum import Enum


class Transaction(BaseModel):
    id: str
    date: date
    amount: float
    description: str
    category: Optional[str] = None
    is_recurring: bool = False


class Frequency(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class PriceTrend(str, Enum):
    STABLE = "stable"
    INCREASED = "increased"
    DECREASED = "decreased"


class Action(str, Enum):
    KEEP = "keep"
    REVIEW = "review"
    DOWNGRADE = "downgrade"
    RENEGOTIATE = "renegotiate"
    CANCEL = "cancel"


class Subscription(BaseModel):
    id: str
    merchant: str
    amount: float
    frequency: Frequency
    category: str
    leak_score: int = 0
    action: Action = Action.REVIEW
    reasoning: str = ""
    price_trend: PriceTrend = PriceTrend.STABLE
    duration_months: int = 0
    price_increases: int = 0


class AnalysisResult(BaseModel):
    analysis_id: str
    status: str = "processing"
    total_monthly_leak: float = 0.0
    overall_score: int = 0
    subscriptions: List[Subscription] = []
    recommendations_summary: dict = {}
    warnings: List[str] = []
    created_at: Optional[datetime] = None
