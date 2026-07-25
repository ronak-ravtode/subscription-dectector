# Design: Gap Fixes & SMS Parser

**Date:** 2026-07-25
**Status:** Approved
**Scope:** Bug fixes, SMS parser, dead code fix, comprehensive tests

---

## 1. Problem Statement

The subscription detector project has 4 bugs, missing SMS parsing (hackathon requirement), dead code in the email webhook, and insufficient test coverage. This plan addresses all gaps.

## 2. Bug Fixes

### 2.1 Mutable Default Argument — `repositories/analysis.py:25`

**Bug:** `warnings: list = []` shares the same list across calls.
**Fix:** Change to `warnings=None`, add `if warnings is None: warnings = []` inside.

### 2.2 Overly Broad Matching — `repositories/subscription.py`

**Bug:** `find_matching_subscription` matches by category OR merchant. Any "entertainment" subscription matches any other "entertainment" subscription.
**Fix:** Remove the `OR category` fallback. Only match by fuzzy merchant name (>0.8 similarity).

### 2.3 Import Inside Function — `recurring_detector.py:154`

**Bug:** `from app.extractors.transaction_extractor import categorize_transaction` is inside `detect_recurring()`.
**Fix:** Move to top of file.

### 2.4 Silent Exception Swallowing — `parsers/pdf_parser.py:21`

**Bug:** `extract_text_from_pdf` catches all exceptions and returns `""` with no logging.
**Fix:** Add `import logging` and `logger.warning(...)` in the except block.

## 3. SMS Parser

### 3.1 New File: `app/parsers/sms_parser.py`

**Supported formats:**
- `Your account was charged $10.00 for Netflix`
- `Transaction of ₹500 at Spotify on 2026-07-20`
- `Debit card transaction of €25.50 at Adobe`
- `Rs. 1,200.00 debited from your account for Amazon`
- `Payment of $9.99 to Hulu processed`

**Returns:** `List[dict]` with keys: `date`, `amount`, `description`

**Edge cases:**
- Relative dates ("Today", "Yesterday", "2 days ago") → converted to actual dates
- Multiple currencies (₹, $, €, £)
- Missing date → defaults to today
- No match → empty list

### 3.2 Wire Into Upload Flow

**Option chosen:** Add `/api/upload-sms` endpoint accepting text input.

```
POST /api/upload-sms
Body: { "sms_text": "string" }
Response: { "analysis_id", "status", "message" }
```

Pipeline: sms_parser → detect_recurring → leak_scorer → recommend_actions → store in DB.

## 4. Dead Code Fix — `main.py:314-320`

**Current:** Email body parsing extracts transactions but discards them (`pass`).
**Fix:** After `extract_transactions_from_email(email_content)`, run through full pipeline:
1. Convert dicts to `Transaction` models
2. Call `detect_recurring(transactions)`
3. Score with `calculate_leak_score`
4. Recommend with `recommend_actions`
5. Store in DB via `add_subscription_to_analysis`

## 5. Test Plan

### 5.1 New Test Files

**`tests/test_sms_parser.py`**
- Test each SMS format variant
- Test relative date parsing
- Test multiple currencies
- Test edge cases (no amount, no date, empty string)

**`tests/test_email_parser.py`**
- Test HTML email parsing
- Test plain text parsing
- Test mixed HTML/text

### 5.2 Expand Existing Tests

**`test_pdf_parser.py`**
- Add success path: parse a real PDF with text content

**`test_repositories.py`**
- Add subscription repo: user isolation, fuzzy matching accuracy

**`tests/test_webhook.py`**
- Test inbound-email with valid PDF attachment
- Test email body fallback path
- Test unknown user handling

### 5.3 Target Coverage

- SMS parser: 10+ test cases
- Email parser: 5+ test cases
- Subscription repo: 5+ test cases
- Webhook: 3+ test cases
- PDF parser success: 1+ test case
