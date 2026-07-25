# Analysis Report Redesign — Design Spec

**Date:** 2026-07-25
**Goal:** Transform the analysis page from a subscription-only view into a comprehensive bank statement report with full transaction ledger, AI insights, comparison, export, and data quality warnings.

---

## 1. Problem Statement

The current Analysis page only shows detected subscriptions. Users cannot see:
- Every transaction extracted from their PDF
- How this analysis compares to previous ones
- What the AI recommends at a high level
- Whether the parser had issues extracting data
- A downloadable report to share or save

## 2. Features

| ID | Feature | Description |
|----|---------|-------------|
| F1 | Transaction List | Full PDF ledger with search, sort, and filter |
| F2 | Warnings Panel | Parser errors, data quality issues, smart suggestions |
| F3 | PDF Export | Branded report with summary, subscriptions, transactions |
| F4 | AI Summary | Gemini-generated brief overview paragraph |
| F5 | Auto-Comparison | Delta vs most recent previous analysis |
| F6 | Category Breakdown | Dollar amounts (monthly + annual) per category |

## 3. Data Model Changes

### 3.1 New Table: `transactions`

```sql
CREATE TABLE transactions (
    id VARCHAR PRIMARY KEY,
    analysis_id VARCHAR NOT NULL REFERENCES analyses(id),
    date DATE NOT NULL,
    amount FLOAT NOT NULL,
    description VARCHAR NOT NULL,
    category VARCHAR,
    is_recurring BOOLEAN DEFAULT FALSE
);
```

### 3.2 Modified Table: `analyses`

Add column:
```sql
ai_summary TEXT DEFAULT NULL;
```

### 3.3 Wire Up: `price_history`

Table exists but is never populated. After analysis completes, record price snapshots for detected subscriptions.

## 4. API Design

### 4.1 Modified Endpoints

**`POST /api/upload`** — after analysis, store all transactions in `transactions` table.

**`GET /api/analysis/{id}`** — response shape:

```json
{
  "analysis_id": "abc123",
  "status": "complete",
  "total_monthly_leak": 45.97,
  "overall_score": 42,
  "ai_summary": "Your subscriptions total $45.97/month across 4 services. Netflix at $18.99 is your biggest expense. Consider canceling unused services to save ~$220/year.",
  "subscriptions": [...],
  "transactions": [
    {
      "id": "...",
      "date": "2026-01-15",
      "amount": 15.99,
      "description": "NETFLIX.COM",
      "category": "entertainment",
      "is_recurring": true
    }
  ],
  "warnings": [
    {"type": "parser", "message": "3 lines could not be parsed"},
    {"type": "quality", "message": "2 transactions had $0.00 amount"},
    {"type": "suggestion", "message": "This looks like a credit card statement"}
  ],
  "comparison": {
    "previous_analysis_id": "def456",
    "previous_date": "2026-01-15",
    "new_subscriptions": ["SPOTIFY"],
    "removed_subscriptions": ["HULU"],
    "price_changes": [
      {"merchant": "NETFLIX", "old_amount": 15.99, "new_amount": 18.99}
    ],
    "score_change": -5
  },
  "recommendations_summary": {"keep": 1, "review": 2, "cancel": 1},
  "created_at": "2026-01-20T10:30:00"
}
```

### 4.2 New Endpoints

**`GET /api/analysis/{id}/compare`** — returns delta vs previous analysis.

Response:
```json
{
  "previous_analysis_id": "def456",
  "previous_date": "2026-01-15",
  "new_subscriptions": ["SPOTIFY"],
  "removed_subscriptions": ["HULU"],
  "price_changes": [
    {"merchant": "NETFLIX", "old_amount": 15.99, "new_amount": 18.99}
  ],
  "score_change": -5
}
```

**`POST /api/analysis/{id}/export`** — generates and returns branded PDF.

Response: `application/pdf` binary.

## 5. Backend Implementation

### 5.1 New File: `app/services/pdf_export.py`

- `generate_analysis_report(analysis, subscriptions, transactions, ai_summary) -> bytes`
- Uses `reportlab` (already installed)
- Branded header with "SubGuard" title and analysis date
- Color-coded scores matching frontend
- Tables for subscriptions, categories, and transactions

### 5.2 Modified: `app/main.py`

- `analyze_statement()`: after detection, store all transactions in `transactions` table
- `analyze_statement()`: generate AI summary via Gemini, store in `analysis.ai_summary`
- `analyze_statement()`: populate `price_history` for detected subscriptions
- `analyze_statement()`: collect and store enhanced warnings
- `GET /api/analysis/{id}`: include `transactions`, `ai_summary`, `warnings`, `comparison` in response
- `GET /api/analysis/{id}/compare`: compute delta vs previous analysis

### 5.3 New: `app/services/ai_summary.py`

- `generate_ai_summary(analysis, subscriptions) -> str`
- Calls Gemini with prompt: "Summarize this subscription analysis in 2-3 sentences. Include total monthly spend, biggest offender, and one-line savings tip."
- Falls back to template-based summary if no Gemini key or API fails

### 5.4 New: `app/services/comparison.py`

- `compare_analyses(current_id, previous_id) -> ComparisonResult`
- Finds new/removed subscriptions by merchant name matching
- Detects price changes (>2% difference)
- Computes score delta

### 5.5 Modified: `app/extractors/transaction_extractor.py`

- `extract_transactions()` now returns `warnings` list alongside transactions
- Warnings include: unparseable dates, zero amounts, unusual formats

## 6. Frontend Implementation

### 6.1 Page Layout: `pages/Analysis.tsx`

Sections from top to bottom:
1. **Summary Cards** — Score, Monthly Leak, Count, + "vs Previous" delta badge
2. **AI Summary Card** — Gemini paragraph with skeleton loading
3. **Warnings Panel** — Three-section display (parser/quality/suggestion)
4. **Category Breakdown** — Pie chart + dollar amounts table
5. **Comparison Panel** — Delta cards (new/removed/price changes)
6. **Subscriptions Table** — Existing, with expandable price history
7. **Transactions Table** — Full ledger with search, sort, filters
8. **Export Button** — "Download PDF Report"

### 6.2 New Components

| Component | File | Purpose |
|-----------|------|---------|
| `AiSummaryCard` | `components/shared/AiSummaryCard.tsx` | Summary paragraph with skeleton |
| `WarningsPanel` | `components/shared/WarningsPanel.tsx` | Three-section warning display |
| `ComparisonPanel` | `components/shared/ComparisonPanel.tsx` | Delta cards |
| `TransactionTable` | `components/shared/TransactionTable.tsx` | Full table with search/sort/filter |
| `CategoryBreakdownTable` | `components/shared/CategoryBreakdownTable.tsx` | Dollar amounts per category |

### 6.3 New Types: `lib/types.ts`

```typescript
interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  is_recurring: boolean;
}

interface Warning {
  type: 'parser' | 'quality' | 'suggestion';
  message: string;
}

interface Comparison {
  previous_analysis_id: string;
  previous_date: string;
  new_subscriptions: string[];
  removed_subscriptions: string[];
  price_changes: Array<{merchant: string; old_amount: number; new_amount: number}>;
  score_change: number;
}
```

### 6.4 New Hook: `hooks/useExportPdf.ts`

- Mutation: `POST /api/analysis/{id}/export`
- Returns PDF blob, triggers browser download

### 6.5 Library Addition

- `@tanstack/react-table` — for sortable/filterable transaction table

## 7. Warnings System

### 7.1 Parser Warnings (red icon)
- "Could not extract text from PDF"
- "X lines could not be parsed"
- "Transaction limit exceeded (500 max)"

### 7.2 Data Quality Warnings (yellow icon)
- "X transactions had $0.00 amount, excluded"
- "X dates could not be parsed, skipped"
- "X amounts had unusual formats"

### 7.3 Suggestions (blue icon)
- "This appears to be a credit card statement"
- "This appears to be a checking account statement"
- "Consider uploading other accounts for a complete picture"

## 8. Auto-Comparison Logic

When `GET /api/analysis/{id}` is called:
1. Find user's most recent analysis **before** the current one
2. Skip any with `status = 'error'`
3. If no previous analysis → `comparison` is `null`
4. Compare by merchant name:
   - **New**: in current, not in previous
   - **Removed**: in previous, not in current
   - **Price change**: same merchant, amount differs by >2%
5. Compute `score_change` = current score - previous score

## 9. PDF Export Design

Report structure:
- **Header**: "SubGuard Analysis Report" + date
- **Summary**: Score, monthly leak, annual projection
- **AI Insights**: ai_summary paragraph
- **Subscriptions Table**: Merchant, Amount, Frequency, Action
- **Category Breakdown**: Category, Monthly, Annual
- **Transactions Table**: Date, Description, Amount, Category
- **Footer**: Page X of Y

## 10. Upload Progress Fix

Remove simulated progress bar in `pages/Upload.tsx`. Use actual upload progress from `XMLHttpRequest` or `axios` onUploadProgress callback.

## 11. Files Changed

### Modified:
| File | Changes |
|------|---------|
| `app/main.py` | Store transactions, AI summary, warnings; new endpoints |
| `app/models_db.py` | Add `transactions` table, `ai_summary` column |
| `app/extractors/transaction_extractor.py` | Return warnings alongside transactions |
| `frontend/src/pages/Analysis.tsx` | Add all new sections |
| `frontend/src/pages/Upload.tsx` | Fix fake progress bar |
| `frontend/src/lib/types.ts` | Add Transaction, Warning, Comparison |
| `frontend/src/hooks/useAnalysis.ts` | Handle new response shape |

### New:
| File | Purpose |
|------|---------|
| `app/services/pdf_export.py` | Branded PDF generation |
| `app/services/ai_summary.py` | Gemini summary generation |
| `app/services/comparison.py` | Analysis comparison logic |
| `frontend/src/components/shared/AiSummaryCard.tsx` | AI summary display |
| `frontend/src/components/shared/WarningsPanel.tsx` | Warnings display |
| `frontend/src/components/shared/ComparisonPanel.tsx` | Comparison display |
| `frontend/src/components/shared/TransactionTable.tsx` | Transaction table |
| `frontend/src/components/shared/CategoryBreakdownTable.tsx` | Category amounts |
| `frontend/src/hooks/useExportPdf.ts` | PDF export mutation |

## 12. Testing

- Unit tests for `comparison.py`, `ai_summary.py`, `pdf_export.py`
- Unit tests for enhanced `extract_transactions()` warnings
- Frontend: verify Analysis page renders all sections
- Integration: upload PDF → verify transactions stored → verify analysis response includes all fields
