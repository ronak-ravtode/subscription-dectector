# SBI Bank Statement Parser Fix — Design Spec

**Date:** 2026-07-25
**Goal:** Fix transaction extraction for SBI (and other Indian bank) statements that use DD/MM/YYYY dates, multi-line descriptions, and amounts embedded in description lines.

---

## 1. Problem Statement

The current transaction extractor fails on real SBI bank statements because:
1. **Date format**: Parser assumes MM/DD/YYYY but SBI uses DD/MM/YYYY
2. **Amount extraction**: Amounts are embedded in description lines, not separated by pipes
3. **Multi-line descriptions**: Descriptions span across multiple lines
4. **Description noise**: Raw descriptions contain UPI references and bank codes

**Current output (broken):**
```
2026-03-06 | 3.06e+26 | C/YESB/GOOGLECLOU/REFUN 2.00 1742.14
2026-05-06 | 6.06e+26 | PAY-12201/SENT10.00 1734.14
```

**Expected output:**
```
2026-06-03 | 2.00 | Google Refund (credit)
2026-06-05 | 10.00 | Khushbub (debit)
```

---

## 2. Root Cause Analysis

### 2.1 Date Format Mismatch

SBI uses DD/MM/YYYY (day first):
```
03/06/2026 03/06/2026 UPI/CR/652032424626/Google
```

Parser tries MM/DD/YYYY first, so:
- `03/06/2026` → March 6th (lucky, both ≤12)
- `21/06/2026` → Invalid (21 > 12 for month)
- `09/06/2026` → September 6th (wrong)

### 2.2 Amount Embedded in Description

SBI format: `TxnDate ValueDate Description Debit Credit Balance`

Example:
```
03/06/2026 03/06/2026 UPI/CR/652032424626/Google
C/YESB/googleclou/Refun 2.00 1742.14
```

The parser sees `2.00 1742.14` and tries to parse `2.00174214` as one number → `3.06e+26`.

### 2.3 Multi-Line Descriptions

Descriptions span across lines:
```
06/06/2026 06/06/2026 UPI/DR/307526956680/SHREE
YO/HDFC/vyapar.169/Sent88.00 1592.14
```

The parser treats each line separately, losing the connection.

---

## 3. Solution Design

### 3.1 Line Merging

**Function:** `merge_continuation_lines(lines)`

Pre-process lines before parsing:
1. Detect lines that start with a date (pattern: `\d{2}/\d{2}/\d{4}`)
2. If a line does NOT start with a date, append it to the previous line
3. Handle the SBI-specific format

**Pseudocode:**
```python
def merge_continuation_lines(lines):
    merged = []
    current = ""
    for line in lines:
        if starts_with_date(line):
            if current:
                merged.append(current)
            current = line
        else:
            current += " " + line.strip()
    if current:
        merged.append(current)
    return merged
```

**Example:**
```
Input:
  06/06/2026 06/06/2026 UPI/DR/307526956680/SHREE
  YO/HDFC/vyapar.169/Sent88.00 1592.14

Output:
  06/06/2026 06/06/2026 UPI/DR/307526956680/SHREE YO/HDFC/vyapar.169/Sent88.00 1592.14
```

### 3.2 Auto-Detect Date Format

**Function:** `detect_date_format(text)`

Scan all dates in the text to determine the format:
1. Extract all date-like strings (e.g., `03/06/2026`, `21/06/2026`)
2. Check if any first component > 12 → must be DD/MM/YYYY
3. If all first components ≤ 12, default to DD/MM/YYYY for Indian banks

**Logic:**
```python
def detect_date_format(dates):
    for date_str in dates:
        parts = re.split(r'[/\-]', date_str)
        if len(parts) == 3:
            first = int(parts[0])
            if first > 12:
                return 'DD/MM/YYYY'  # Day must be first
    return 'DD/MM/YYYY'  # Default for Indian banks
```

**Example:**
- SBI: `03/06/2026`, `21/06/2026`, `09/06/2026` → 21 > 12 → DD/MM/YYYY ✓
- US bank: `03/06/2026`, `09/06/2026`, `11/06/2026` → all ≤ 12 → DD/MM/YYYY (still works for Indian)

### 3.3 Amount Extraction from Mixed Format

**Function:** `extract_amount_from_description(line)`

Extract amount using a smarter pattern:
1. After the date, look for the last number on the line (that's the balance)
2. Look for the second-to-last number (that's the amount)
3. Or match the pattern: `Sent\d+\.\d+` or `Refun \d+\.\d+` or just `\d+\.\d+` before the balance

**Pattern:**
```python
# Match amount patterns like: Sent88.00, Refun 2.00, or just 88.00
AMOUNT_IN_DESCRIPTION = r'(?:Sent|Refun|Pay|Manda|UPIInt)?\s*(\d+\.?\d*)\s+(\d+\.?\d*)$'
# Group 1 = amount, Group 2 = balance (last number on line)
```

**Example:**
- `...Refun 2.00 1742.14` → amount=2.00, balance=1742.14 ✓
- `...Sent88.00 1592.14` → amount=88.00, balance=1592.14 ✓
- `...UPI 3000.00 5241.14` → amount=3000.00, balance=5241.14 ✓

### 3.4 Description Cleaning

**Function:** `clean_description(raw)`

Extract meaningful merchant name from UPI references:

**Logic:**
```python
BANK_CODES = {'YESB', 'UTIB', 'HDFC', 'SBIN', 'ICIC', 'KKBK', 'BARB', 'NSPB'}

def clean_description(raw):
    # Split by /
    parts = raw.split('/')
    clean_parts = []
    for part in parts:
        part = part.strip()
        # Skip bank codes
        if part.upper() in BANK_CODES:
            continue
        # Skip pure numbers (UPI references)
        if re.match(r'^\d+$', part):
            continue
        # Skip known prefixes
        if part.upper() in ('UPI', 'CR', 'DR', 'REF'):
            continue
        # Keep meaningful parts
        if len(part) > 2:
            clean_parts.append(part)
    
    result = ' '.join(clean_parts)
    # Remove trailing action words
    result = re.sub(r'\s*(Sent|Refun|Pay|Manda|UPIInt)\s*$', '', result)
    return result.strip()
```

**Example transformations:**
| Raw | Cleaned |
|-----|---------|
| `UPI/CR/652032424626/Google C/YESB/googleclou/Refun` | `Google Refund` |
| `UPI/DR/307482307701/KHUSHBUB/UTIB/gpay-12201/Sent` | `Khushbub Gpay` |
| `UPI/DR/307717045337/Amazon I/RATN/amazon@rap/You a` | `Amazon` |
| `UPI/DR/309100300885/Blinkit/HDFC/blinkit.pa/UPIInt` | `Blinkit` |

### 3.5 Transaction Type Detection

**Function:** `detect_transaction_type(raw_line)`

Detect credit/debit from UPI codes:
```python
def detect_transaction_type(raw_line):
    if '/CR/' in raw_line.upper():
        return 'credit'
    elif '/DR/' in raw_line.upper():
        return 'debit'
    return 'unknown'
```

---

## 4. Data Model Changes

### 4.1 Modified: `app/models.py`

Add optional fields to `Transaction`:

```python
@dataclass
class Transaction:
    id: str
    date: date
    amount: float
    description: str
    category: str
    transaction_type: str = 'unknown'  # 'credit', 'debit', 'unknown'
    raw_description: str = ''          # Original UPI reference
    balance: float = 0.0               # Running balance (if available)
```

---

## 5. Implementation Plan

### 5.1 Files to Modify

| File | Changes |
|------|---------|
| `app/extractors/transaction_extractor.py` | Add line merging, auto-detect dates, smart amount extraction, description cleaning |
| `app/models.py` | Add `transaction_type`, `raw_description`, `balance` fields to `Transaction` |
| `tests/test_transaction_extractor.py` | Add tests for SBI format parsing |

### 5.2 New Helper Functions

1. `merge_continuation_lines(lines)` - Merge multi-line transactions
2. `detect_date_format(text)` - Auto-detect DD/MM vs MM/DD
3. `extract_amount_from_description(line)` - Parse amounts from mixed format
4. `clean_description(raw)` - Clean UPI references to merchant names
5. `detect_transaction_type(line)` - Detect credit/debit

### 5.3 Testing Strategy

1. **Unit tests** for each helper function
2. **Integration test** with the actual SBI PDF (`DepositAccountStatement_unlocked.pdf`)
3. **Regression test** to ensure existing MM/DD/YYYY parsers still work

---

## 6. Expected Results

### 6.1 SBI Statement Test Case

**Input (raw text from PDF):**
```
03/06/2026 03/06/2026 UPI/CR/652032424626/Google
C/YESB/googleclou/Refun 2.00 1742.14
```

**Expected output:**
```
Transaction(
    date=2026-06-03,
    amount=2.00,
    description='Google Refund',
    transaction_type='credit',
    balance=1742.14
)
```

### 6.2 Full SBI Statement Test

Expected to detect ~25 transactions with correct dates, amounts, and descriptions.

---

## 7. Backward Compatibility

The changes are backward compatible:
- Existing pipe-separated formats still work (line merging is skipped)
- MM/DD/YYYY dates still work (auto-detect only changes when DD/MM is detected)
- Existing tests should still pass

---

## 8. Future Extensions

This design can be extended for other Indian banks:
- **HDFC**: Similar UPI format, may have NEFT/RTGS references
- **ICICI**: May have different description structure
- **Axis**: May have different column layout

The auto-detect and line merging logic is bank-agnostic and should work for most formats.
