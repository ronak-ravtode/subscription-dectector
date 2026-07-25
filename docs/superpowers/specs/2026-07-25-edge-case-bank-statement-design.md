# Edge Case Bank Statement PDF Generator — Design Spec

**Date:** 2026-07-25
**Goal:** Generate comprehensive test bank statement PDFs that stress both PDF parsing and subscription detection logic.
**Approach:** Extend existing `create_sample.py` using `reportlab`.

---

## Output Files

### Combined PDF
- `sample_statements/edge_cases_all.pdf`
- Multi-page document with labeled sections per category
- ~50-60 transactions total

### Per-Category PDFs (`sample_statements/edge_cases/`)
| File | Transactions | Focus |
|------|-------------|-------|
| `date_formats.pdf` | 10 | Date parsing robustness |
| `amount_formats.pdf` | 10 | Amount parsing robustness |
| `descriptions.pdf` | 10 | Description anomaly handling |
| `subscription_patterns.pdf` | 12 | Subscription detection logic |
| `structural.pdf` | 10 | Structural edge cases |
| `special.pdf` | 10 | Unicode, encoding, multi-currency |
| `multi_page.pdf` | 25+ | Page boundary handling |
| `memo_fields.pdf` | 10 | Extra reference columns |
| `fees.pdf` | 10 | Fee/charge type detection |
| `ocr_artifacts.pdf` | 10 | Degraded text quality |
| `autopay_cancellation.pdf` | 8 | Cancellation detection logic |

---

## Edge Case Categories

### 1. Date Formats
Transactions with inconsistent date formatting:
- `01/15/2026` — standard MM/DD/YYYY
- `15-01-2026` — DD-MM-YYYY
- `2026-01-15` — ISO YYYY-MM-DD
- `Jan 15, 2026` — MMM DD, YYYY
- `1/5/2026` — missing leading zeros
- `01/05/26` — two-digit year
- `2026/01/15` — YYYY/MM/DD
- `15 Jan 2026` — DD MMM YYYY

**Why:** Tests whether the parser can normalize multiple date formats into a consistent internal representation.

### 2. Amount Formats
Transactions with varied amount representations:
- `-15.99` — standard negative
- `(15.99)` — accounting-style negative
- `1,299.99` — comma-separated thousands
- `15` — no decimal places
- `$0.99` — leading zero
- `USD 45.20` — currency code prefix
- `₹1,500.00` — non-USD symbol
- `15.99-` — trailing negative sign
- `-0.00` — negative zero
- `1,000,000.00` — large amount with multiple commas

**Why:** Tests amount normalization across different bank statement formats.

### 3. Description Anomalies
Transactions with unusual description patterns:
- `NETFLIX.COM *STREAMING SERVICE` — very long (40+ chars)
- `STARBUCKS #12345 / DOWNTOWN` — special characters `#`, `/`
- `uber eats - dinner delivery` — mixed case
- `   SPOTIFY   ` — extra leading/trailing spaces
- `AMAZON MKTPL*2K4JF8...` — truncated with ellipsis
- `O` — single character description
- `A very long merchant name that exceeds typical column width and wraps around the page` — 80+ chars
- ` merchant with leading space` — leading space only
- `merchant with trailing space ` — trailing space only

**Why:** Tests description cleaning, normalization, and merchant name extraction.

### 4. Subscription Patterns
Transactions designed to test subscription detection edge cases:
- Netflix $15.99 on 01/05, 02/05, 03/05 — regular monthly (easy case)
- Spotify $9.99 on 01/15, 02/14, 03/16 — slightly irregular (±1-2 days)
- Adobe $54.99 on 01/10, then $0.00 on 02/10 — trial-to-paid transition
- iCloud $2.99 on 01/01, 02/01, 03/01 — micro-amount subscription
- Gym $49.99 on 01/01, then $49.99 on 02/01, then $0.00 on 03/01 — cancelled
- Netflix $15.99 on 01/05, $15.99 on 02/05, $18.99 on 03/05 — price increase
- Same amount $9.99 from different merchants — false positive test
- Annual subscription $119.99 on 01/15, then nothing for 11 months
- Subscription with refunds: $15.99 charge, then -$15.99 refund, then $15.99 charge
- Bundle: "NETFLIX+HULU BUNDLE" $25.98 — combined subscription
- Free trial: $0.00 on 01/01, $0.00 on 02/01, $9.99 on 03/01
- Irregular: subscription every 28 days (leap year edge)

**Why:** Tests whether the detector correctly identifies, groups, and categorizes recurring charges.

### 5. Structural Edge Cases
Transactions with unusual PDF/table structure:
- Empty description rows (date and amount only)
- Amount present but description missing
- Duplicate transactions on the same day (same merchant, same amount)
- Transactions at very top/bottom of page (page boundary)
- Zero-amount rows (`0.00`)
- Rows with only whitespace
- Transactions with inconsistent column alignment
- Header row repeated mid-table

**Why:** Tests parser resilience against malformed or inconsistent PDF table structures.

### 6. Special Encoding
Transactions with non-ASCII content:
- `CAFÉ RÉSUMÉ` — accented characters
- `東京スシロー` — Japanese characters
- `Café del Mar €45.00` — mixed Unicode + currency
- `Naïve Café` — diaeresis
- `Ñoño Restaurant` — tilde
- `Über` — umlaut
- Multi-byte emoji in descriptions (if reportlab supports it)
- Right-to-left text artifacts

**Why:** Tests Unicode handling in the PDF parser and merchant name normalization.

### 7. Multi-Page Statements
- 25+ transactions forcing a page break
- Page numbers at bottom of each page
- Header repeated on each page
- Summary section on final page only
- Transaction list split mid-row across pages

**Why:** Tests that the parser correctly concatenates multi-page content.

### 8. Memo/Reference Fields
Transactions with additional columns beyond Date/Description/Amount:
- `Check #` column
- `Reference #` column
- `Category` column (auto-categorized)
- `Running Balance` column
- Mixed: some rows have memo data, others don't

**Why:** Tests parser handling of extra columns and field extraction.

### 9. Fee/Charge Variations
Transactions representing various bank fees:
- NSF/Overdraft fee: `$35.00 - OVERDRAFT FEE`
- Wire transfer fee: `$25.00 - WIRE TRANSFER`
- Foreign transaction fee: `$1.50 - FOREIGN TXN FEE`
- Monthly maintenance: `$12.00 - SERVICE CHARGE`
- ATM fee: `$3.00 - ATM WITHDRAWAL FEE`
- Late payment fee: `$25.00 - LATE FEE`
- Balance inquiry: `$2.50 - BAL INQ FEE`
- Stop payment: `$30.00 - STOP PAYMENT`

**Why:** Tests whether fee transactions are correctly excluded from subscription detection.

### 10. OCR Artifacts
Transactions with intentionally degraded text quality:
- Misaligned columns (text shifted 5-10px)
- Slightly faded text (lighter gray color)
- Characters with extra spacing: `N E T F L I X`
- Broken characters: `NETFLI` + line break + `X.COM`
- Smudged/overlapping text areas

**Why:** Tests parser robustness against imperfect OCR output or low-quality PDFs.

### 11. Autopay Cancellation Detection
Transactions simulating a subscription that was cancelled but may still appear:
- `01/15/2026` — NETFLIX.COM $15.99 (active)
- `01/20/2026` — User claims cancellation
- `02/15/2026` — NETFLIX.COM $15.99 (still charged — cancellation didn't take effect)
- `02/20/2026` — Refund request: -$15.99
- `03/15/2026` — No charge (finally cancelled)
- `03/15/2026` — SPOTIFY PREMIUM $9.99 (new subscription started)
- `04/15/2026` — SPOTIFY PREMIUM $9.99 (active)

This tests whether the detector can:
1. Identify that a subscription appeared to be cancelled
2. Detect post-cancellation charges
3. Handle refund transactions
4. Distinguish between cancelled and active subscriptions

**Why:** Real-world edge case where cancellation processing delays cause continued charges.

---

## Implementation Notes

### Dependencies
- `reportlab` — needed for PDF generation (add to `requirements.txt`)

### File Changes
- Modify: `subscription-detector/create_sample.py`
- Modify: `subscription-detector/requirements.txt` — add `reportlab`
- New directory: `subscription-detector/sample_statements/edge_cases/`

### Functions to Add
- `create_edge_case_combined()` — generates `edge_cases_all.pdf`
- `create_edge_case_<category>()` — generates per-category PDFs (11 functions)
- Helper: `draw_statement_header(c, title, account_info, period)` — reusable header
- Helper: `draw_transactions_table(c, transactions, start_y)` — reusable table renderer
- Helper: `draw_summary(c, deposits, withdrawals, balance)` — reusable summary section
- `if __name__ == "__main__":` block calling all generators

### Transaction Data Format
```python
transactions = [
    {
        "date": "01/15/2026",
        "description": "NETFLIX.COM",
        "amount": -15.99,
        "memo": "SUBSCRIPTION",      # optional
        "reference": "TXN-001",      # optional
        "category": "Entertainment",  # optional
        "balance": 3230.66,           # optional
    },
    ...
]
```
