from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List, Dict
from enum import Enum


class Transaction(BaseModel):
    # Identity
    id: str
    statement_id: str = ''

    # Source
    bank_name: str = ''
    account_number: str = ''  # masked
    account_type: str = ''

    # Dates
    date: date
    value_date: Optional[date] = None

    # Description
    description: str
    raw_description: str = ''
    merchant_raw: str = ''
    merchant_normalized: str = ''

    # Amount
    amount: float
    currency: str = 'INR'
    transaction_type: str = 'unknown'  # 'debit' | 'credit' | 'unknown'

    # Balance
    balance: float = 0.0

    # Metadata
    channel: str = ''  # 'upi' | 'neft' | 'rtgs' | 'atm' | 'pos'
    page_number: int = 0
    line_number: int = 0
    extraction_method: str = 'rules'  # 'rules' | 'template' | 'ai' | 'human'

    # Classification
    category: str = 'other'
    subcategory: str = ''
    is_recurring: bool = False
    recurrence_period: Optional[str] = None
    is_subscription: bool = False
    is_refund: bool = False
    is_reversal: bool = False
    is_fee: bool = False
    is_salary_credit: bool = False
    is_loan_emi: bool = False
    is_bill_payment: bool = False

    # Quality
    confidence_score: float = 0.0  # 0.0 - 1.0
    field_confidences: Dict[str, float] = {}

    # Flags
    is_fraud_suspected: bool = False
    needs_review: bool = False
    review_reason: Optional[str] = None


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
    warnings: List[dict] = []
    created_at: Optional[datetime] = None


class EmailConnectRequest(BaseModel):
    email: str
    app_password: str


class EmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    last_scan: Optional[datetime] = None
    emails_scanned: int = 0
    subscriptions_detected: int = 0


class EmailScanResponse(BaseModel):
    status: str
    emails_scanned: int
    new_emails: int
    transactions_found: int
    subscriptions_detected: int
