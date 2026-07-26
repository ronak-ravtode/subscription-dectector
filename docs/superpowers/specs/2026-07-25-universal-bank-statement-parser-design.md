# Universal Bank Statement Parser — Design Spec

**Date:** 2026-07-25
**Goal:** Build a production-grade bank statement intelligence system that works for ANY bank worldwide
**Timeline:** 12 weeks (Production-ready)
**Tech Stack:** Python/FastAPI + Hybrid AI/ML

---

## 1. Executive Summary

A bank-statement processing system that ingests statements from any bank, in any format, in any language, and in any currency, then extracts clean transaction data with high accuracy, strong privacy protection, and reliable edge-case handling.

**Core Principle:** Deterministic first, ML second, LLM last.

---

## 2. System Architecture

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ Privacy & Security (Encryption, RBAC, Audit, PII)              │
│ Monitoring & Observability (Metrics, Logs, Alerts)              │
│ Orchestration (Job Queue, Retry, Scheduling, Parallel)         │
│                                                                 │
│ Ingestion → Image Processing → OCR → Document Understanding    │
│                                                                 │
│ → Hybrid Extraction → Validation → Normalization                │
│                                                                 │
│ → Intelligence → Confidence → Storage → API                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Details

| # | Component | Sub-components |
|---|-----------|----------------|
| 1 | Document Ingestion | PDF/Image/Email handling |
| 2 | Image Processing | Deskew, Denoise, Orientation, Resolution |
| 3 | OCR & Text Extraction | Native PDF, OCR, Language detection |
| 4 | Document Understanding | Bank Detection, Layout, Table, Transaction Regions |
| 5 | Hybrid Extraction Engine | Tier 1 Rules, Tier 2 Templates, Tier 3 AI, Tier 4 Human |
| 6 | Validation Engine | Balance reconciliation, Date validation, Duplicates, Arithmetic |
| 7 | Normalization Engine | Merchant, Currency, Date, Category normalization |
| 8 | Intelligence Engine | Merchant Resolution → Categorization → Recurring → Subscriptions → Insights → Fraud → Leak Score → Recommendations |
| 9 | Confidence & Quality Engine | Field-level confidence, OCR confidence, Parser confidence |
| 10 | Storage & Audit Layer | Raw Files → OCR Output → Canonical Transactions → Analytics DB → Audit Logs |
| 11 | API Layer | JSON, CSV, Dashboard, Reports |

### 2.3 Cross-Cutting Layers

- **Privacy & Security:** Encryption, RBAC, Audit, PII redaction
- **Monitoring & Observability:** Metrics, Logs, Alerts
- **Orchestration:** Job Queue, Retry, Scheduling, Parallel Processing

---

## 3. Canonical Transaction Schema

```python
@dataclass
class Transaction:
    # Identity
    transaction_id: str
    statement_id: str
    
    # Source
    bank_name: str
    account_number: str  # masked
    account_type: str
    
    # Dates
    txn_date: date
    value_date: Optional[date]
    
    # Description
    raw_description: str
    normalized_description: str
    merchant_raw: str
    merchant_normalized: str
    
    # Amount
    amount: Decimal
    currency: str
    debit_credit_flag: str  # 'debit' | 'credit'
    
    # Balance
    balance: Optional[Decimal]
    
    # Metadata
    channel: str  # 'upi' | 'neft' | 'rtgs' | 'atm' | 'pos' | 'net_banking'
    page_number: int
    line_number: int
    extraction_method: str  # 'rules' | 'template' | 'ai' | 'human'
    
    # Classification
    category: str
    subcategory: str
    is_recurring: bool
    recurrence_period: Optional[str]
    is_subscription: bool
    is_refund: bool
    is_reversal: bool
    is_fee: bool
    is_salary_credit: bool
    is_loan_emi: bool
    is_bill_payment: bool
    
    # Quality
    confidence_score: float  # 0.0 - 1.0
    field_confidences: Dict[str, float]  # per-field confidence
    
    # Flags
    is_fraud_suspected: bool
    needs_review: bool
    review_reason: Optional[str]
```

---

## 4. Tiered Extraction Engine

### 4.1 Tier 1: Rule-Based Extraction (Fastest, Free)

**When to use:** Clean digital PDFs with predictable patterns

**Techniques:**
- Regex patterns for dates, amounts, balances
- Line merging for multi-line descriptions
- Pipe/tab/comma delimiter detection
- Column position detection

**Confidence:** High (95-100%) when patterns match

### 4.2 Tier 2: Template-Based Extraction (Fast, Free)

**When to use:** Known bank formats with specific layouts

**Template structure:**
```python
BANK_TEMPLATES = {
    'sbi': {
        'bank_name': 'State Bank of India',
        'date_format': 'DD/MM/YYYY',
        'columns': ['txn_date', 'value_date', 'description', 'debit', 'credit', 'balance'],
        'description_separator': '/',
        'amount_prefix': ['Sent', 'Refun', 'Pay'],
    },
    'hdfc': {
        'bank_name': 'HDFC Bank',
        'date_format': 'DD/MM/YYYY',
        'columns': ['date', 'narration', 'chq_no', 'value_date', 'withdrawal', 'deposit', 'balance'],
        'narration_cleaning': True,
    },
    # ... more banks
}
```

**Confidence:** High (90-99%) for template-matched banks

### 4.3 Tier 3: AI Extraction (Slower, Costs Money)

**When to use:** Unknown formats, scanned PDFs, complex layouts

**How it works:**
1. Send PDF page to Gemini Vision / GPT-4V
2. Ask for structured JSON output
3. Parse and validate AI response
4. Extract transactions

**Confidence:** Medium (70-90%) - depends on document quality

### 4.4 Tier 4: Human Review (Slowest, Expensive)

**When to use:** Low confidence from Tiers 1-3

**How it works:**
1. Flag transactions with confidence < 70%
2. Queue for human review
3. Human confirms/corrects
4. Feed back into template library

**Confidence:** N/A (human-verified)

### 4.5 Tier Selection Logic

```python
def select_tier(document):
    if is_clean_digital_pdf(document):
        return Tier.RULES
    elif is_known_bank(document):
        return Tier.TEMPLATES
    elif has_text_layer(document):
        return Tier.TEMPLATES  # Try templates first
    else:
        return Tier.AI
```

---

## 5. Intelligence Engine

### 5.1 Pipeline

```
Merchant Resolution → Categorization → Recurring Detection → Subscription Detection
         ↓
Financial Insights → Fraud Detection → Leak Scoring → Recommendations
```

### 5.2 Merchant Resolution

Group different descriptions into the same merchant identity:

| Raw Description | Normalized Merchant |
|-----------------|---------------------|
| NETFLIX.COM | Netflix |
| NETFLIX INDIA | Netflix |
| Netflix*Subs | Netflix |
| SPOTIFY PREMIUM | Spotify |
| Spotify India | Spotify |

**Techniques:**
- Fuzzy string matching (Levenshtein, Jaccard)
- Embedding similarity (sentence-transformers)
- Merchant database lookup
- User-customizable rules

### 5.3 Transaction Categorization

```python
CATEGORIES = {
    'entertainment': ['Netflix', 'Spotify', 'Disney+', 'YouTube'],
    'software': ['Adobe', 'Microsoft', 'GitHub', 'Figma'],
    'utilities': ['Electric', 'Gas', 'Water', 'Internet'],
    'insurance': ['Life', 'Health', 'Auto', 'Home'],
    'food': ['Swiggy', 'Zomato', 'Uber Eats'],
    'shopping': ['Amazon', 'Flipkart', 'Myntra'],
    'transport': ['Uber', 'Ola', 'Fuel', 'Parking'],
    'health': ['Pharmacy', 'Hospital', 'Gym'],
    'education': ['Courses', 'Books', 'Tuition'],
    'financial': ['EMI', 'Loan', 'Insurance Premium'],
    'transfer': ['UPI', 'NEFT', 'RTGS', 'IMPS'],
    'salary': ['Salary', 'Wages', 'Bonus'],
    'other': ['Uncategorized'],
}
```

### 5.4 Recurring Detection

**Algorithm:**
1. Group by merchant (using normalized names)
2. Calculate time intervals between transactions
3. Check if intervals are consistent (±2 days for monthly)
4. Check if amounts are consistent (±5% variance)
5. Classify frequency: weekly, monthly, quarterly, annual

**Output:**
```python
@dataclass
class RecurringPattern:
    merchant: str
    frequency: str  # 'weekly' | 'monthly' | 'quarterly' | 'annual'
    avg_amount: float
    interval_days: int
    consistency_score: float  # 0.0 - 1.0
    transaction_count: int
    first_seen: date
    last_seen: date
```

### 5.5 Subscription Detection

**Heuristics:**
- Amount is round number ($9.99, $14.99, $19.99)
- Merchant is known subscription service
- Frequency is monthly
- Amount hasn't changed much over time
- No associated physical goods

**Subscription types:**
```python
SUBSCRIPTION_TYPES = {
    'streaming': ['Netflix', 'Spotify', 'Disney+', 'YouTube Premium'],
    'software': ['Adobe', 'Microsoft 365', 'GitHub Pro'],
    'cloud': ['iCloud', 'Google One', 'Dropbox'],
    'gym': ['Gym', 'Fitness', 'Yoga'],
    'news': ['Times Prime', 'Medium', 'Substack'],
    'delivery': ['Amazon Prime', 'Swiggy One', 'Zomato Gold'],
    'other': ['Unknown Subscription'],
}
```

### 5.6 Leak Scoring

```python
def calculate_leak_score(subscription):
    score = 0
    
    # Amount factor (higher = more leak)
    score += min(subscription.amount / 10, 30)
    
    # Inactivity factor (not used = leak)
    if subscription.last_used_days_ago > 30:
        score += 20
    
    # Price increase factor
    if subscription.price_trend == 'increased':
        score += 15
    
    # Redundancy factor (duplicate service)
    if has_duplicate_service(subscription):
        score += 20
    
    # Value assessment
    if subscription.user_value == 'low':
        score += 15
    
    return min(score, 100)
```

### 5.7 Recommendations

```python
ACTIONS = {
    'keep': 'Subscription provides good value, keep it',
    'review': 'Review usage, consider if still needed',
    'downgrade': 'Consider a cheaper plan',
    'renegotiate': 'Contact provider for better pricing',
    'cancel': 'Cancel to save money',
}
```

**Decision logic:**
- High value + low leak score → Keep
- High value + high leak score → Review
- Low value + low cost → Review
- Low value + high cost → Cancel
- Duplicate service → Cancel one

---

## 6. Confidence & Quality Engine

### 6.1 Field-Level Confidence

```python
@dataclass
class FieldConfidence:
    field_name: str
    value: Any
    confidence: float  # 0.0 - 1.0
    source: str  # 'rules' | 'template' | 'ai' | 'human'
    reason: str  # Why this confidence level
```

### 6.2 Confidence Levels

| Level | Range | Description |
|-------|-------|-------------|
| High | 0.9 - 1.0 | Direct text extraction, exact pattern match |
| Medium | 0.7 - 0.9 | OCR text, fuzzy merchant match, AI-extracted |
| Low | 0.5 - 0.7 | Blurry OCR, ambiguous format, missing fields |
| Very Low | < 0.5 | Corrupted text, missing critical fields |

### 6.3 Quality Gates

- Balance reconciliation (opening + credits - debits = closing)
- Date validation (no future dates, value_date >= txn_date)
- Amount validation (positive amounts, correct debit/credit signs)
- Duplicate detection

---

## 7. Privacy & Security

### 7.1 Data Protection

- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Data minimization:** Delete raw PDFs after processing
- **PII masking:** Account numbers, IFSC codes, UPI IDs
- **Retention:** Raw data 7 days, transactions 1 year, audit logs 2 years

### 7.2 Access Control

- **RBAC:** viewer, analyst, admin roles
- **Resource-level permissions:** Users can only access their own data
- **Rate limiting:** 100 requests per hour per user

### 7.3 Audit Logging

Every action logged:
- timestamp
- user_id
- action (upload, extract, view, export, delete)
- document_id
- details
- ip_address
- user_agent

---

## 8. API Design

### 8.1 Endpoints

```python
# Document Processing
POST   /api/v2/documents/upload
GET    /api/v2/documents/{id}/status
GET    /api/v2/documents/{id}/transactions
DELETE /api/v2/documents/{id}

# Transaction Analysis
GET    /api/v2/analysis/{id}/summary
GET    /api/v2/analysis/{id}/subscriptions
GET    /api/v2/analysis/{id}/recurring
GET    /api/v2/analysis/{id}/anomalies
GET    /api/v2/analysis/{id}/recommendations

# Intelligence
GET    /api/v2/merchants
GET    /api/v2/categories
GET    /api/v2/spending-trends
GET    /api/v2/leak-score

# Reports
POST   /api/v2/reports/generate
GET    /api/v2/reports/{id}/download
GET    /api/v2/reports/{id}/status

# Admin
GET    /api/v2/admin/audit-logs
GET    /api/v2/admin/metrics
GET    /api/v2/admin/health
```

---

## 9. Implementation Plan

### Phase 1: Core Extraction (Weeks 1-2)
- Refactor PDF parser with preprocessing pipeline
- Implement Tier 1 rule-based extraction
- Add OCR support (Tesseract)
- Create bank template system
- Add SBI, HDFC, ICICI, Axis templates
- Implement document understanding
- Add confidence scoring

### Phase 2: Intelligence Layer (Weeks 3-4)
- Implement merchant resolution
- Add transaction categorization
- Implement recurring detection
- Add subscription detection
- Implement leak scoring
- Add recommendation engine
- Implement anomaly detection

### Phase 3: AI Integration (Weeks 5-6)
- Integrate Gemini Vision for OCR
- Add GPT-4V fallback
- Implement AI extraction with validation
- Add human review queue
- Implement feedback loop

### Phase 4: Production Hardening (Weeks 7-8)
- Add encryption at rest and in transit
- Implement PII redaction
- Add audit logging
- Implement rate limiting
- Add monitoring and metrics
- Implement job queue (Redis/Celery)
- Add retry and dead letter queue

### Phase 5: UI & Reports (Weeks 9-10)
- Redesign analysis page
- Add subscription dashboard
- Implement PDF report generation
- Add CSV export
- Implement spending trends visualization

### Phase 6: Testing & Launch (Weeks 11-12)
- Add integration tests for 20+ banks
- Load testing
- Security audit
- Documentation
- Beta testing
- Production deployment

---

## 10. Expected Results

### 10.1 Accuracy Targets

| Metric | Target |
|--------|--------|
| Transaction extraction accuracy | > 95% |
| Merchant normalization accuracy | > 90% |
| Subscription detection accuracy | > 85% |
| False positive rate | < 5% |
| Processing time (digital PDF) | < 5 seconds |
| Processing time (scanned PDF) | < 30 seconds |

### 10.2 Supported Banks (Phase 1)

- State Bank of India (SBI)
- HDFC Bank
- ICICI Bank
- Axis Bank
- Bank of Baroda (BOB)
- Punjab National Bank (PNB)
- Kotak Mahindra Bank
- Yes Bank
- IDBI Bank
- Union Bank of India

### 10.3 Scalability

- **Start:** 100 documents/day
- **Scale:** 10,000+ documents/day
- **Architecture:** Horizontal scaling with job queue

---

## 11. Success Criteria

1. **Universal extraction:** Works for any bank statement format
2. **High accuracy:** > 95% transaction extraction accuracy
3. **Fast processing:** < 5 seconds for digital PDFs
4. **Privacy-first:** All data encrypted, PII masked
5. **Actionable insights:** Clear subscription recommendations
6. **Production-ready:** Monitoring, logging, error handling
