# SBI Bank Statement Parser Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix transaction extraction for SBI bank statements by adding line merging, auto-detect date format, smart amount extraction, and description cleaning.

**Architecture:** Pre-process lines to merge multi-line transactions, auto-detect DD/MM vs MM/DD date format, extract amounts from mixed description lines, and clean UPI references to merchant names.

**Tech Stack:** Python, PyPDF2, regex

## Global Constraints

- Python 3.10+
- Existing tests must continue to pass
- Backward compatible with MM/DD/YYYY formats
- No new dependencies required

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/extractors/transaction_extractor.py` | Main parser with new helper functions |
| `app/models.py` | Transaction dataclass (add new fields) |
| `tests/test_transaction_extractor.py` | Unit tests for all parser functions |
| `tests/test_sbi_parser.py` | Integration test with real SBI PDF |

---

### Task 1: Update Transaction Model

**Files:**
- Modify: `app/models.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: None
- Produces: `Transaction` dataclass with new optional fields

- [ ] **Step 1: Read current Transaction model**

```python
# Current model in app/models.py
@dataclass
class Transaction:
    id: str
    date: date
    amount: float
    description: str
    category: str
```

- [ ] **Step 2: Add new optional fields**

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

- [ ] **Step 3: Run existing tests to verify backward compatibility**

Run: `pytest tests/test_transaction_extractor.py -v`
Expected: All existing tests PASS (new fields have defaults)

- [ ] **Step 4: Commit**

```bash
git add app/models.py
git commit -m "feat: add transaction_type, raw_description, balance fields to Transaction model"
```

---

### Task 2: Add Line Merging Function

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: List of strings (raw lines from PDF)
- Produces: List of strings (merged lines)

- [ ] **Step 1: Write the failing test**

```python
def test_merge_continuation_lines():
    from app.extractors.transaction_extractor import merge_continuation_lines
    
    lines = [
        "06/06/2026 06/06/2026 UPI/DR/307526956680/SHREE",
        "YO/HDFC/vyapar.169/Sent88.00 1592.14",
        "09/06/2026 09/06/2026 UPI/DR/307688610837/Ganesh",
        "D/YESB/paytmqr5e9/Sent30.00 1562.14",
    ]
    
    result = merge_continuation_lines(lines)
    
    assert len(result) == 2
    assert "SHREE YO/HDFC" in result[0]
    assert "Ganesh D/YESB" in result[1]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_merge_continuation_lines -v`
Expected: FAIL with "merge_continuation_lines not defined"

- [ ] **Step 3: Write minimal implementation**

```python
import re

def merge_continuation_lines(lines):
    """Merge continuation lines (lines without dates) into previous line."""
    merged = []
    current = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if line starts with a date pattern (DD/MM/YYYY or MM/DD/YYYY)
        if re.match(r'\d{2}/\d{2}/\d{4}', line):
            if current:
                merged.append(current)
            current = line
        else:
            # Continuation line - append to previous
            if current:
                current += " " + line
            else:
                # Orphan line without preceding date - skip
                continue
    
    if current:
        merged.append(current)
    
    return merged
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_merge_continuation_lines -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: add merge_continuation_lines function for multi-line descriptions"
```

---

### Task 3: Add Date Format Auto-Detection

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: String (raw text from PDF)
- Produces: String ('DD/MM/YYYY' or 'MM/DD/YYYY')

- [ ] **Step 1: Write the failing test**

```python
def test_detect_date_format_dd_mm():
    from app.extractors.transaction_extractor import detect_date_format
    
    text = """03/06/2026 03/06/2026 UPI/CR/652032424626/Google
21/06/2026 21/06/2026 UPI/DR/308936127166/PATHAN"""
    
    result = detect_date_format(text)
    assert result == 'DD/MM/YYYY'


def test_detect_date_format_mm_dd():
    from app.extractors.transaction_extractor import detect_date_format
    
    text = """01/15/2026 | $15.99 | NETFLIX.COM
02/15/2026 | $15.99 | NETFLIX.COM"""
    
    result = detect_date_format(text)
    assert result == 'MM/DD/YYYY'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_detect_date_format_dd_mm -v`
Expected: FAIL with "detect_date_format not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def detect_date_format(text):
    """Auto-detect date format from text content.
    
    Returns 'DD/MM/YYYY' if any day > 12, otherwise 'MM/DD/YYYY'.
    Defaults to 'DD/MM/YYYY' for Indian bank statements.
    """
    # Find all date-like patterns
    date_pattern = r'(\d{2})/(\d{2})/(\d{4})'
    matches = re.findall(date_pattern, text)
    
    for first, second, year in matches:
        first_int = int(first)
        second_int = int(second)
        
        # If first component > 12, it must be day (DD/MM)
        if first_int > 12:
            return 'DD/MM/YYYY'
        
        # If second component > 12, it must be day (MM/DD)
        if second_int > 12:
            return 'MM/DD/YYYY'
    
    # Default to DD/MM for Indian banks
    return 'DD/MM/YYYY'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_detect_date_format_dd_mm -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: add detect_date_format function for auto-detecting DD/MM vs MM/DD"
```

---

### Task 4: Add Amount Extraction from Description

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: String (merged line with date, description, amount, balance)
- Produces: Tuple[float, float] (amount, balance) or (None, None)

- [ ] **Step 1: Write the failing test**

```python
def test_extract_amount_from_description():
    from app.extractors.transaction_extractor import extract_amount_from_description
    
    # Test various SBI formats
    assert extract_amount_from_description("...Refun 2.00 1742.14") == (2.00, 1742.14)
    assert extract_amount_from_description("...Sent88.00 1592.14") == (88.00, 1592.14)
    assert extract_amount_from_description("...UPI 3000.00 5241.14") == (3000.00, 5241.14)
    assert extract_amount_from_description("...Pay3599.00 1642.14") == (3599.00, 1642.14)
    assert extract_amount_from_description("no amount here") == (None, None)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_extract_amount_from_description -v`
Expected: FAIL with "extract_amount_from_description not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def extract_amount_from_description(line):
    """Extract amount and balance from SBI-format description line.
    
    Returns (amount, balance) or (None, None) if not found.
    """
    # Match patterns like: Sent88.00 1592.14 or Refun 2.00 1742.14
    # Group 1 = amount, Group 2 = balance (last number on line)
    pattern = r'(?:Sent|Refun|Pay|Manda|UPIInt|UPI)?\s*(\d+\.?\d*)\s+(\d+\.?\d*)\s*$'
    
    match = re.search(pattern, line)
    if match:
        amount = float(match.group(1))
        balance = float(match.group(2))
        return (amount, balance)
    
    return (None, None)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_extract_amount_from_description -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: add extract_amount_from_description for SBI format amounts"
```

---

### Task 5: Add Description Cleaning Function

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: String (raw UPI description)
- Produces: String (cleaned merchant name)

- [ ] **Step 1: Write the failing test**

```python
def test_clean_description():
    from app.extractors.transaction_extractor import clean_description
    
    # Test various SBI UPI formats
    assert clean_description("UPI/CR/652032424626/Google C/YESB/googleclou/Refun") == "Google Refund"
    assert clean_description("UPI/DR/307482307701/KHUSHBUB/UTIB/gpay-12201/Sent") == "Khushbub Gpay"
    assert clean_description("UPI/DR/307717045337/Amazon I/RATN/amazon@rap/You a") == "Amazon"
    assert clean_description("UPI/DR/309100300885/Blinkit/HDFC/blinkit.pa/UPIInt") == "Blinkit"
    assert clean_description("UPI/DR/208660647489/VIDHATA/YESB/q696463962/Sent") == "Vidhata"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_clean_description -v`
Expected: FAIL with "clean_description not defined"

- [ ] **Step 3: Write minimal implementation**

```python
BANK_CODES = {'YESB', 'UTIB', 'HDFC', 'SBIN', 'ICIC', 'KKBK', 'BARB', 'NSPB'}
UPI_PREFIXES = {'UPI', 'CR', 'DR', 'REF'}
ACTION_WORDS = {'Sent', 'Refun', 'Pay', 'Manda', 'UPIInt'}

def clean_description(raw):
    """Clean UPI reference to extract meaningful merchant name."""
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
        if part.upper() in UPI_PREFIXES:
            continue
        
        # Skip action words at the end
        if part in ACTION_WORDS:
            continue
        
        # Skip very short parts (likely codes)
        if len(part) <= 2:
            continue
        
        # Keep meaningful parts
        clean_parts.append(part)
    
    result = ' '.join(clean_parts)
    
    # Clean up any remaining action words at the end
    result = re.sub(r'\s*(Sent|Refun|Pay|Manda|UPIInt)\s*$', '', result)
    
    # Title case for readability
    return result.strip().title()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_clean_description -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: add clean_description for UPI reference cleanup"
```

---

### Task 6: Add Transaction Type Detection

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: String (raw line from PDF)
- Produces: String ('credit', 'debit', or 'unknown')

- [ ] **Step 1: Write the failing test**

```python
def test_detect_transaction_type():
    from app.extractors.transaction_extractor import detect_transaction_type
    
    assert detect_transaction_type("UPI/CR/652032424626/Google") == 'credit'
    assert detect_transaction_type("UPI/DR/307482307701/KHUSHBUB") == 'debit'
    assert detect_transaction_type("UPI/REF/223055004572/CR") == 'credit'
    assert detect_transaction_type("normal transaction") == 'unknown'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_detect_transaction_type -v`
Expected: FAIL with "detect_transaction_type not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def detect_transaction_type(raw_line):
    """Detect if transaction is credit or debit from UPI codes."""
    line_upper = raw_line.upper()
    
    if '/CR/' in line_upper:
        return 'credit'
    elif '/DR/' in line_upper:
        return 'debit'
    
    return 'unknown'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_detect_transaction_type -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: add detect_transaction_type for credit/debit detection"
```

---

### Task 7: Integrate All Functions into Main Parser

**Files:**
- Modify: `app/extractors/transaction_extractor.py`
- Test: `tests/test_transaction_extractor.py`

**Interfaces:**
- Consumes: All helper functions from Tasks 2-6
- Produces: Updated `extract_transactions_from_text` function

- [ ] **Step 1: Write the failing integration test**

```python
def test_extract_sbi_transactions():
    from app.extractors.transaction_extractor import extract_transactions_from_text
    
    # Simulated SBI format (after line merging)
    text = """03/06/2026 03/06/2026 UPI/CR/652032424626/Google C/YESB/googleclou/Refun 2.00 1742.14
05/06/2026 05/06/2026 UPI/DR/307482307701/KHUSHBUB/UTIB/gpay-12201/Sent10.00 1734.14
21/06/2026 21/06/2026 UPI/CR/617276472483/Ravtode/SBIN/rajesh.d.r/UPI 3000.00 5241.14"""
    
    transactions, warnings = extract_transactions_from_text(text)
    
    assert len(transactions) == 3
    
    # Check first transaction (credit)
    assert transactions[0].date.year == 2026
    assert transactions[0].date.month == 6
    assert transactions[0].date.day == 3
    assert transactions[0].amount == 2.00
    assert transactions[0].transaction_type == 'credit'
    assert 'Google' in transactions[0].description
    
    # Check second transaction (debit)
    assert transactions[1].date.day == 5
    assert transactions[1].amount == 10.00
    assert transactions[1].transaction_type == 'debit'
    assert 'Khushbub' in transactions[1].description
    
    # Check third transaction (large credit)
    assert transactions[2].date.day == 21
    assert transactions[2].amount == 3000.00
    assert transactions[2].transaction_type == 'credit'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_transaction_extractor.py::test_extract_sbi_transactions -v`
Expected: FAIL (current parser doesn't handle SBI format)

- [ ] **Step 3: Update extract_transactions_from_text to use new functions**

```python
def extract_transactions_from_text(text: str) -> Tuple[List[Transaction], List[dict]]:
    """Parse raw text into structured transactions using regex.
    
    Returns:
        Tuple of (transactions, warnings) where warnings is a list of
        dicts with 'type' and 'message' keys.
    """
    transactions = []
    warnings = []
    
    # Step 1: Merge continuation lines
    lines = text.split('\n')
    lines = [l.strip() for l in lines]
    merged_lines = merge_continuation_lines(lines)
    
    # Step 2: Detect date format
    date_format = detect_date_format(text)
    
    # Step 3: Parse each merged line
    for line in merged_lines:
        if not line or len(line) < 10:
            continue
        
        # Try to extract date
        date_match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
        if not date_match:
            continue
        
        date_str = date_match.group(1)
        
        # Parse date based on detected format
        if date_format == 'DD/MM/YYYY':
            day, month, year = date_str.split('/')
            parsed_date = parse_date(f"{month}/{day}/{year}")  # Convert to MM/DD for parser
        else:
            parsed_date = parse_date(date_str)
        
        if not parsed_date:
            continue
        
        # Try SBI format first (amount in description)
        amount, balance = extract_amount_from_description(line)
        
        if amount is not None:
            # SBI format detected
            raw_desc = line[date_match.end():]
            description = clean_description(raw_desc)
            transaction_type = detect_transaction_type(line)
            
            transactions.append(Transaction(
                id=str(uuid.uuid4()),
                date=parsed_date.date(),
                amount=abs(amount),
                description=description.upper(),
                category=categorize_transaction(description),
                transaction_type=transaction_type,
                raw_description=raw_desc.strip(),
                balance=balance,
            ))
            continue
        
        # Fall back to original pipe-separated format
        pipe_parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(pipe_parts) >= 3:
            date_str, amount_str, desc = pipe_parts[0], pipe_parts[1], pipe_parts[2]
            parsed_date = parse_date(date_str)
            amount = parse_amount(amount_str)
            if parsed_date and amount is not None and len(desc) >= 2:
                if amount == 0:
                    continue
                category = categorize_transaction(desc)
                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=parsed_date.date(),
                    amount=abs(amount),
                    description=desc.upper(),
                    category=category,
                ))
                continue
        
        # Try to find amount and date in line (generic format)
        amount_match = re.search(AMOUNT_PATTERN, line)
        if amount_match:
            amount = parse_amount(amount_match.group(0))
            if amount and amount > 0:
                description = line[:amount_match.start()]
                description = re.sub(r'\s+', ' ', description).strip()
                description = re.sub(r'^[\s\-–—|/\\:]+|[\s\-–—|/\\:]+$', '', description)
                
                if len(description) >= 2:
                    category = categorize_transaction(description)
                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=parsed_date.date(),
                        amount=abs(amount),
                        description=description.upper(),
                        category=category,
                    ))
    
    return transactions, warnings
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_transaction_extractor.py::test_extract_sbi_transactions -v`
Expected: PASS

- [ ] **Step 5: Run all existing tests to verify backward compatibility**

Run: `pytest tests/test_transaction_extractor.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/extractors/transaction_extractor.py tests/test_transaction_extractor.py
git commit -m "feat: integrate SBI format parsing into main extractor"
```

---

### Task 8: Integration Test with Real SBI PDF

**Files:**
- Create: `tests/test_sbi_parser.py`
- Test: Real SBI PDF file

**Interfaces:**
- Consumes: Real SBI PDF file
- Produces: Verification of correct transaction extraction

- [ ] **Step 1: Create integration test file**

```python
import pytest
from app.parsers.pdf_parser import parse_pdf
from app.extractors.transaction_extractor import extract_transactions_from_text


def test_sbi_statement_integration():
    """Test with real SBI bank statement PDF."""
    pdf_path = r'A:\innovahack\DepositAccountStatement_unlocked.pdf'
    
    # Parse PDF
    text = parse_pdf(pdf_path)
    assert len(text) > 100, "PDF text extraction failed"
    
    # Extract transactions
    transactions, warnings = extract_transactions_from_text(text)
    
    # Should find ~25 transactions
    assert len(transactions) >= 20, f"Expected >= 20 transactions, got {len(transactions)}"
    
    # Verify dates are correct (June 2026)
    for t in transactions:
        assert t.date.year == 2026, f"Wrong year: {t.date}"
        assert t.date.month == 6, f"Wrong month: {t.date}"
    
    # Verify amounts are reasonable (not scientific notation)
    for t in transactions:
        assert t.amount < 100000, f"Amount too large: {t.amount}"
        assert t.amount > 0, f"Amount should be positive: {t.amount}"
    
    # Verify descriptions are cleaned
    for t in transactions:
        assert 'UPI/CR' not in t.description, f"Description not cleaned: {t.description}"
        assert 'UPI/DR' not in t.description, f"Description not cleaned: {t.description}"
    
    # Check specific transactions
    google_refund = [t for t in transactions if 'Google' in t.description]
    assert len(google_refund) >= 1, "Should find Google refund transaction"
    assert google_refund[0].transaction_type == 'credit'
    assert google_refund[0].amount == 2.00
    
    print(f"\n✓ Found {len(transactions)} transactions from SBI statement")
    for t in transactions[:5]:
        print(f"  {t.date} | ₹{t.amount:.2f} | {t.description} | {t.transaction_type}")
```

- [ ] **Step 2: Run integration test**

Run: `pytest tests/test_sbi_parser.py -v`
Expected: PASS with ~25 transactions found

- [ ] **Step 3: Commit**

```bash
git add tests/test_sbi_parser.py
git commit -m "test: add integration test for real SBI bank statement"
```

---

### Task 9: Final Verification and Cleanup

**Files:**
- Modify: `app/extractors/transaction_extractor.py` (cleanup)
- Test: All tests

**Interfaces:**
- Consumes: All previous tasks
- Produces: Final working parser

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Manual verification with SBI PDF**

Run: `python -c "from app.parsers.pdf_parser import parse_pdf; from app.extractors.transaction_extractor import extract_transactions_from_text; text = parse_pdf(r'A:\innovahack\DepositAccountStatement_unlocked.pdf'); txns, _ = extract_transactions_from_text(text); print(f'Found {len(txns)} transactions'); [print(f'  {t.date} | {t.amount} | {t.description}') for t in txns[:10]]"`

Expected: ~25 transactions with correct dates and amounts

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete SBI bank statement parser fix

- Add line merging for multi-line descriptions
- Add auto-detect date format (DD/MM vs MM/DD)
- Add smart amount extraction from mixed format
- Add description cleaning for UPI references
- Add transaction type detection (credit/debit)
- Add integration test with real SBI PDF"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Update Transaction Model | 5 min |
| 2 | Add Line Merging Function | 10 min |
| 3 | Add Date Format Auto-Detection | 10 min |
| 4 | Add Amount Extraction | 10 min |
| 5 | Add Description Cleaning | 10 min |
| 6 | Add Transaction Type Detection | 5 min |
| 7 | Integrate All Functions | 15 min |
| 8 | Integration Test | 10 min |
| 9 | Final Verification | 5 min |
| **Total** | | **~80 min** |

---

## Expected Results

After implementation, the parser will correctly handle:

**Input (raw SBI text):**
```
03/06/2026 03/06/2026 UPI/CR/652032424626/Google
C/YESB/googleclou/Refun 2.00 1742.14
```

**Output:**
```
Transaction(
    date=2026-06-03,
    amount=2.00,
    description='GOOGLE REFUND',
    transaction_type='credit',
    balance=1742.14
)
```
