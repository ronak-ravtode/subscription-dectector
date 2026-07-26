# Universal Bank Statement Parser — Phase 1: Core Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a universal bank statement parser that extracts transactions from ANY bank format using a tiered extraction engine (Rules → Templates → AI → Human).

**Architecture:** 4-tier extraction pipeline with preprocessing, document understanding, and confidence scoring. Rules handle clean digital PDFs, templates handle known banks, AI handles unknown formats, human review handles low-confidence cases.

**Tech Stack:** Python 3.10+, FastAPI, PyPDF2, Tesseract OCR, SQLAlchemy, SQLite

## Global Constraints

- Python 3.10+
- Existing tests must continue to pass
- Backward compatible with current API
- No new frontend changes in this phase
- Privacy-first: no raw PDF storage after processing

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/preprocessing/image_processor.py` | Image enhancement (deskew, denoise, orientation) |
| `app/preprocessing/ocr_engine.py` | OCR with Tesseract, language detection |
| `app/understanding/document_classifier.py` | Bank detection, document type classification |
| `app/understanding/layout_detector.py` | Table detection, column boundaries |
| `app/extraction/tier1_rules.py` | Regex-based extraction for clean PDFs |
| `app/extraction/tier2_templates.py` | Bank-specific template matching |
| `app/extraction/tier3_ai.py` | AI-powered extraction (Gemini/GPT-4V) |
| `app/extraction/tier4_human.py` | Human review queue |
| `app/extraction/extraction_engine.py` | Orchestrates tier selection and extraction |
| `app/extraction/templates/` | Bank-specific template files |
| `app/validation/balance_checker.py` | Balance reconciliation |
| `app/validation/date_validator.py` | Date validation |
| `app/validation/duplicate_detector.py` | Duplicate transaction detection |
| `app/validation/validation_engine.py` | Orchestrates validation |
| `app/confidence/confidence_scorer.py` | Field-level confidence scoring |
| `app/models.py` | Extended Transaction model |
| `app/models_db.py` | Database models |
| `tests/test_preprocessing.py` | Preprocessing tests |
| `tests/test_tier1_rules.py` | Tier 1 tests |
| `tests/test_tier2_templates.py` | Tier 2 tests |
| `tests/test_validation.py` | Validation tests |
| `tests/test_confidence.py` | Confidence tests |

---

### Task 1: Extend Transaction Model with Confidence Fields

**Files:**
- Modify: `app/models.py`

**Interfaces:**
- Consumes: None
- Produces: `Transaction` dataclass with confidence fields

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
    is_recurring: bool = False
    transaction_type: str = 'unknown'
    raw_description: str = ''
    balance: float = 0.0
```

- [ ] **Step 2: Add confidence and quality fields**

```python
@dataclass
class Transaction:
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
    field_confidences: Dict[str, float] = field(default_factory=dict)
    
    # Flags
    is_fraud_suspected: bool = False
    needs_review: bool = False
    review_reason: Optional[str] = None
```

- [ ] **Step 3: Run existing tests to verify backward compatibility**

Run: `pytest tests/test_transaction_extractor.py -v`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/models.py
git commit -m "feat: extend Transaction model with confidence and quality fields"
```

---

### Task 2: Add Document Classifier

**Files:**
- Create: `app/understanding/document_classifier.py`
- Test: `tests/test_document_classifier.py`

**Interfaces:**
- Consumes: PDF file path or extracted text
- Produces: `DocumentInfo` with bank name, document type, language

- [ ] **Step 1: Write the failing test**

```python
def test_classify_sbi_statement():
    from app.understanding.document_classifier import classify_document
    
    text = """State Bank of India
Account Statement
Account: ****001
Statement Period: 01/06/2026 to 30/06/2026"""
    
    result = classify_document(text)
    assert result.bank_name == 'State Bank of India'
    assert result.bank_code == 'sbi'
    assert result.document_type == 'account_statement'
    assert result.language == 'en'


def test_classify_hdfc_statement():
    from app.understanding.document_classifier import classify_document
    
    text = """HDFC BANK
Credit Card Statement
Card: ****1234
Statement Date: 15/01/2026"""
    
    result = classify_document(text)
    assert result.bank_name == 'HDFC Bank'
    assert result.bank_code == 'hdfc'
    assert result.document_type == 'credit_card_statement'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_document_classifier.py::test_classify_sbi_statement -v`
Expected: FAIL with "classify_document not defined"

- [ ] **Step 3: Write implementation**

```python
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class DocumentInfo:
    bank_name: str
    bank_code: str
    document_type: str  # 'account_statement' | 'credit_card_statement' | 'passbook'
    language: str  # ISO 639-1 code
    account_number_masked: str = ''
    statement_period: str = ''

BANK_SIGNATURES = {
    'sbi': {
        'name': 'State Bank of India',
        'patterns': [r'State Bank of India', r'SBI', r'sbi\.co\.in'],
        'document_type': 'account_statement',
    },
    'hdfc': {
        'name': 'HDFC Bank',
        'patterns': [r'HDFC Bank', r'HDFC', r'hdfcbank\.com'],
        'document_type': 'credit_card_statement',
    },
    'icici': {
        'name': 'ICICI Bank',
        'patterns': [r'ICICI Bank', r'ICICI', r'icicibank\.com'],
        'document_type': 'account_statement',
    },
    'axis': {
        'name': 'Axis Bank',
        'patterns': [r'Axis Bank', r'AXIS', r'axisbank\.com'],
        'document_type': 'account_statement',
    },
    'bob': {
        'name': 'Bank of Baroda',
        'patterns': [r'Bank of Baroda', r'BOB', r'bob\.com'],
        'document_type': 'account_statement',
    },
    'pnb': {
        'name': 'Punjab National Bank',
        'patterns': [r'Punjab National Bank', r'PNB', r'pnb\.co\.in'],
        'document_type': 'account_statement',
    },
}

def classify_document(text: str) -> DocumentInfo:
    """Classify bank statement document."""
    text_lower = text.lower()
    
    # Detect bank
    bank_code = 'unknown'
    bank_name = 'Unknown Bank'
    for code, info in BANK_SIGNATURES.items():
        for pattern in info['patterns']:
            if pattern.lower() in text_lower:
                bank_code = code
                bank_name = info['name']
                break
        if bank_code != 'unknown':
            break
    
    # Detect document type
    document_type = 'account_statement'
    if bank_code in BANK_SIGNATURES:
        document_type = BANK_SIGNATURES[bank_code]['document_type']
    
    # Detect language (basic)
    language = 'en'  # Default English
    if re.search(r'[\u0900-\u097F]', text):  # Devanagari
        language = 'hi'
    
    # Extract masked account number
    account_match = re.search(r'\*{4,}(\d{4})', text)
    account_number_masked = account_match.group(0) if account_match else ''
    
    # Extract statement period
    period_match = re.search(r'Statement Period:?\s*(.+?)(?:\n|$)', text, re.IGNORECASE)
    statement_period = period_match.group(1).strip() if period_match else ''
    
    return DocumentInfo(
        bank_name=bank_name,
        bank_code=bank_code,
        document_type=document_type,
        language=language,
        account_number_masked=account_number_masked,
        statement_period=statement_period,
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_document_classifier.py::test_classify_sbi_statement -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/understanding/document_classifier.py tests/test_document_classifier.py
git commit -m "feat: add document classifier for bank detection"
```

---

### Task 3: Add Tier 1 Rule-Based Extraction

**Files:**
- Create: `app/extraction/tier1_rules.py`
- Test: `tests/test_tier1_rules.py`

**Interfaces:**
- Consumes: Text from PDF
- Produces: List of `Transaction` objects

- [ ] **Step 1: Write the failing test**

```python
def test_extract_pipe_separated():
    from app.extraction.tier1_rules import extract_with_rules
    
    text = """01/15/2026 | $15.99 | NETFLIX.COM
02/15/2026 | $9.99 | SPOTIFY PREMIUM
03/15/2026 | $54.99 | ADOBE CREATIVE CLOUD"""
    
    transactions = extract_with_rules(text)
    assert len(transactions) == 3
    assert transactions[0].amount == 15.99
    assert transactions[0].merchant_normalized == 'NETFLIX.COM'
    assert transactions[0].confidence_score > 0.9


def test_extract_date_amount_description():
    from app.extraction.tier1_rules import extract_with_rules
    
    text = """01/15/2026
NETFLIX.COM
-$15.99

02/15/2026
SPOTIFY PREMIUM
-$9.99"""
    
    transactions = extract_with_rules(text)
    assert len(transactions) == 2
    assert transactions[0].amount == 15.99
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_tier1_rules.py::test_extract_pipe_separated -v`
Expected: FAIL with "extract_with_rules not defined"

- [ ] **Step 3: Write implementation**

```python
import re
from typing import List, Tuple
from app.models import Transaction
import uuid

# Date patterns
DATE_PATTERNS = [
    (r'(\d{2})/(\d{2})/(\d{4})', 'DD/MM/YYYY'),
    (r'(\d{2})-(\d{2})-(\d{4})', 'DD-MM-YYYY'),
    (r'(\d{4})-(\d{2})-(\d{2})', 'YYYY-MM-DD'),
    (r'(\d{2})/(\d{2})/(\d{2})', 'DD/MM/YY'),
]

# Amount patterns
AMOUNT_PATTERNS = [
    r'[\$₹€£]\s*([\d,]+\.?\d*)',  # Currency symbol
    r'-([\d,]+\.?\d*)',           # Negative sign
    r'\(([\d,]+\.?\d*)\)',        # Accounting negative
    r'([\d,]+\.?\d*)',            # Plain number
]

# Skip keywords
SKIP_KEYWORDS = ['account', 'statement', 'balance', 'summary', 'total', 'date', 'description']

def detect_date_format(text: str) -> str:
    """Auto-detect date format from text."""
    for pattern, fmt in DATE_PATTERNS:
        matches = re.findall(pattern, text)
        for first, second, year in matches:
            first_int = int(first)
            second_int = int(second)
            if first_int > 12:
                return 'DD/MM/YYYY'
            if second_int > 12:
                return 'MM/DD/YYYY'
    return 'DD/MM/YYYY'  # Default for Indian banks

def parse_date(date_str: str, format_hint: str = 'DD/MM/YYYY') -> Optional[date]:
    """Parse date string with format hint."""
    from datetime import datetime
    
    for pattern, fmt in DATE_PATTERNS:
        match = re.match(pattern, date_str)
        if match:
            groups = match.groups()
            try:
                if fmt == 'DD/MM/YYYY' or fmt == 'DD-MM-YYYY':
                    return datetime(int(groups[2]), int(groups[1]), int(groups[0])).date()
                elif fmt == 'YYYY-MM-DD':
                    return datetime(int(groups[0]), int(groups[1]), int(groups[2])).date()
                elif fmt == 'DD/MM/YY':
                    year = int(groups[2])
                    year = year + 2000 if year < 50 else year + 1900
                    return datetime(year, int(groups[1]), int(groups[0])).date()
            except ValueError:
                continue
    return None

def parse_amount(amount_str: str) -> Optional[float]:
    """Parse amount string to float."""
    cleaned = re.sub(r'[₹€£$]', '', amount_str).strip()
    cleaned = cleaned.replace(',', '')
    cleaned = re.sub(r'[^\d.]', '', cleaned)
    try:
        return float(cleaned)
    except ValueError:
        return None

def merge_continuation_lines(lines: List[str]) -> List[str]:
    """Merge lines without dates into previous line."""
    merged = []
    current = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        has_date = any(re.match(pattern, line) for pattern, _ in DATE_PATTERNS)
        
        if has_date:
            if current:
                merged.append(current)
            current = line
        else:
            if current:
                current += " " + line
    
    if current:
        merged.append(current)
    
    return merged

def extract_transactions_from_line(line: str, format_hint: str) -> List[Transaction]:
    """Extract transactions from a single line."""
    transactions = []
    
    # Try pipe-separated format
    pipe_parts = [p.strip() for p in line.split('|') if p.strip()]
    if len(pipe_parts) >= 3:
        date_str, amount_str, desc = pipe_parts[0], pipe_parts[1], pipe_parts[2]
        parsed_date = parse_date(date_str, format_hint)
        amount = parse_amount(amount_str)
        if parsed_date and amount is not None:
            transactions.append(Transaction(
                id=str(uuid.uuid4()),
                date=parsed_date,
                amount=abs(amount),
                description=desc.strip(),
                transaction_type='credit' if amount > 0 else 'debit',
                confidence_score=0.95,
                extraction_method='rules',
            ))
            return transactions
    
    # Try date on first line, description on second, amount on third
    lines = line.split('\n')
    if len(lines) >= 3:
        date_str = lines[0].strip()
        desc = lines[1].strip()
        amount_str = lines[2].strip()
        
        parsed_date = parse_date(date_str, format_hint)
        amount = parse_amount(amount_str)
        
        if parsed_date and amount is not None and len(desc) >= 2:
            transactions.append(Transaction(
                id=str(uuid.uuid4()),
                date=parsed_date,
                amount=abs(amount),
                description=desc,
                transaction_type='credit' if amount > 0 else 'debit',
                confidence_score=0.90,
                extraction_method='rules',
            ))
            return transactions
    
    # Try to find amount and date in single line
    amount_match = None
    for pattern in AMOUNT_PATTERNS:
        amount_match = re.search(pattern, line)
        if amount_match:
            break
    
    if amount_match:
        amount = parse_amount(amount_match.group(0))
        if amount and amount > 0:
            line_without_amount = line[:amount_match.start()] + line[amount_match.end():]
            
            for date_pattern, _ in DATE_PATTERNS:
                date_match = re.search(date_pattern, line_without_amount)
                if date_match:
                    parsed_date = parse_date(date_match.group(0), format_hint)
                    if parsed_date:
                        desc = line_without_amount[:date_match.start()] + line_without_amount[date_match.end():]
                        desc = re.sub(r'\s+', ' ', desc).strip()
                        desc = re.sub(r'^[\s\-–—|/\\:]+|[\s\-–—|/\\:]+$', '', desc)
                        
                        if len(desc) >= 2:
                            transactions.append(Transaction(
                                id=str(uuid.uuid4()),
                                date=parsed_date,
                                amount=abs(amount),
                                description=desc,
                                transaction_type='credit' if amount > 0 else 'debit',
                                confidence_score=0.85,
                                extraction_method='rules',
                            ))
                            break
    
    return transactions

def extract_with_rules(text: str) -> List[Transaction]:
    """Extract transactions using rule-based approach."""
    if not text or len(text.strip()) < 10:
        return []
    
    # Detect date format
    format_hint = detect_date_format(text)
    
    # Split into lines and merge continuations
    lines = text.split('\n')
    merged_lines = merge_continuation_lines(lines)
    
    # Extract transactions from each line
    transactions = []
    for line in merged_lines:
        # Skip header/footer lines
        line_lower = line.lower()
        if any(kw in line_lower for kw in SKIP_KEYWORDS):
            continue
        if len(line) < 10:
            continue
        
        txns = extract_transactions_from_line(line, format_hint)
        transactions.extend(txns)
    
    return transactions
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_tier1_rules.py::test_extract_pipe_separated -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/extraction/tier1_rules.py tests/test_tier1_rules.py
git commit -m "feat: add tier 1 rule-based extraction engine"
```

---

### Task 4: Add Bank Template System

**Files:**
- Create: `app/extraction/templates/` directory
- Create: `app/extraction/templates/sbi.json`
- Create: `app/extraction/templates/hdfc.json`
- Create: `app/extraction/tier2_templates.py`
- Test: `tests/test_tier2_templates.py`

**Interfaces:**
- Consumes: Text, bank code
- Produces: List of `Transaction` objects

- [ ] **Step 1: Create template directory and SBI template**

```json
{
  "bank_name": "State Bank of India",
  "bank_code": "sbi",
  "date_format": "DD/MM/YYYY",
  "columns": ["txn_date", "value_date", "description", "debit", "credit", "balance"],
  "description_separator": "/",
  "amount_prefixes": ["Sent", "Refun", "Pay", "Manda", "UPIInt"],
  "bank_codes_to_remove": ["YESB", "UTIB", "HDFC", "SBIN", "ICIC", "KKBK", "BARB", "NSPB"],
  "UPI_PREFIXES": ["UPI", "CR", "DR", "REF"],
  "skip_keywords": ["account", "statement", "balance", "summary", "total"],
  "multi_line": true
}
```

- [ ] **Step 2: Create HDFC template**

```json
{
  "bank_name": "HDFC Bank",
  "bank_code": "hdfc",
  "date_format": "DD/MM/YYYY",
  "columns": ["date", "narration", "chq_no", "value_date", "withdrawal", "deposit", "balance"],
  "narration_cleaning": true,
  "skip_keywords": ["account", "statement", "balance", "summary", "total"],
  "multi_line": false
}
```

- [ ] **Step 3: Write the failing test**

```python
def test_extract_with_sbi_template():
    from app.extraction.tier2_templates import extract_with_template
    
    text = """03/06/2026 03/06/2026 UPI/CR/652032424626/Google
C/YESB/googleclou/Refun 2.00 1742.14
05/06/2026 05/06/2026 UPI/DR/307482307701/KHUSHBUB/UTIB/gpay-12201/Sent10.00 1734.14"""
    
    transactions = extract_with_template(text, 'sbi')
    assert len(transactions) == 2
    assert transactions[0].amount == 2.00
    assert transactions[0].transaction_type == 'credit'
    assert 'Google' in transactions[0].merchant_normalized
```

- [ ] **Step 4: Write implementation**

```python
import json
import os
import re
from typing import List, Optional
from app.models import Transaction
import uuid

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), 'templates')

def load_template(bank_code: str) -> dict:
    """Load bank template from JSON file."""
    template_path = os.path.join(TEMPLATES_DIR, f'{bank_code}.json')
    if os.path.exists(template_path):
        with open(template_path, 'r') as f:
            return json.load(f)
    return None

def clean_description(raw: str, template: dict) -> str:
    """Clean description using template rules."""
    parts = raw.split('/')
    clean_parts = []
    
    for part in parts:
        part = part.strip()
        
        # Skip bank codes
        if part.upper() in [c.upper() for c in template.get('bank_codes_to_remove', [])]:
            continue
        
        # Skip pure numbers
        if re.match(r'^\d+$', part):
            continue
        
        # Skip UPI prefixes
        if part.upper() in [p.upper() for p in template.get('UPI_PREFIXES', [])]:
            continue
        
        # Skip very short parts
        if len(part) <= 2:
            continue
        
        clean_parts.append(part)
    
    result = ' '.join(clean_parts)
    result = re.sub(r'\s*(Sent|Refun|Pay|Manda|UPIInt)\s*$', '', result)
    return result.strip().title()

def extract_amount_from_line(line: str, template: dict) -> Optional[tuple]:
    """Extract amount and balance from line."""
    pattern = r'(?:Sent|Refun|Pay|Manda|UPIInt|UPI)?\s*(\d+\.?\d*)\s+(\d+\.?\d*)\s*$'
    match = re.search(pattern, line)
    if match:
        return (float(match.group(1)), float(match.group(2)))
    return None

def detect_transaction_type(line: str) -> str:
    """Detect credit/debit from UPI codes."""
    line_upper = line.upper()
    if '/CR/' in line_upper or line_upper.endswith('/CR'):
        return 'credit'
    elif '/DR/' in line_upper or line_upper.endswith('/DR'):
        return 'debit'
    return 'unknown'

def merge_continuation_lines(lines: List[str]) -> List[str]:
    """Merge lines without dates into previous line."""
    merged = []
    current = ""
    
    date_pattern = r'\d{2}/\d{2}/\d{4}'
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if re.match(date_pattern, line):
            if current:
                merged.append(current)
            current = line
        else:
            if current:
                current += " " + line
    
    if current:
        merged.append(current)
    
    return merged

def extract_with_template(text: str, bank_code: str) -> List[Transaction]:
    """Extract transactions using bank-specific template."""
    template = load_template(bank_code)
    if not template:
        return []
    
    lines = text.split('\n')
    
    # Merge continuation lines if needed
    if template.get('multi_line', False):
        lines = merge_continuation_lines(lines)
    
    transactions = []
    date_format = template.get('date_format', 'DD/MM/YYYY')
    
    for line in lines:
        if not line or len(line) < 10:
            continue
        
        line_lower = line.lower()
        if any(kw in line_lower for kw in template.get('skip_keywords', [])):
            continue
        
        # Try to extract amount
        amount_result = extract_amount_from_line(line, template)
        if amount_result:
            amount, balance = amount_result
            
            # Extract date
            date_match = re.search(r'(\d{2}/\d{2}/\d{4})', line)
            if date_match:
                from datetime import datetime
                try:
                    parsed_date = datetime.strptime(date_match.group(0), '%d/%m/%Y').date()
                except ValueError:
                    continue
                
                # Extract description
                raw_desc = line[date_match.end():]
                cleaned_desc = clean_description(raw_desc, template)
                txn_type = detect_transaction_type(line)
                
                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=parsed_date,
                    amount=abs(amount),
                    description=cleaned_desc,
                    raw_description=raw_desc.strip(),
                    merchant_normalized=cleaned_desc.upper(),
                    transaction_type=txn_type,
                    balance=balance,
                    confidence_score=0.92,
                    extraction_method='template',
                    bank_name=template.get('bank_name', ''),
                ))
    
    return transactions
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest tests/test_tier2_templates.py::test_extract_with_sbi_template -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/extraction/templates/ app/extraction/tier2_templates.py tests/test_tier2_templates.py
git commit -m "feat: add tier 2 template-based extraction with SBI/HDFC templates"
```

---

### Task 5: Add Extraction Engine Orchestrator

**Files:**
- Create: `app/extraction/extraction_engine.py`
- Test: `tests/test_extraction_engine.py`

**Interfaces:**
- Consumes: Text, DocumentInfo
- Produces: List of `Transaction` objects with tier info

- [ ] **Step 1: Write the failing test**

```python
def test_extraction_engine_selects_tier1():
    from app.extraction.extraction_engine import ExtractionEngine
    
    # Clean pipe-separated format should use Tier 1
    text = """01/15/2026 | $15.99 | NETFLIX.COM
02/15/2026 | $9.99 | SPOTIFY PREMIUM"""
    
    engine = ExtractionEngine()
    result = engine.extract(text, bank_code='unknown')
    
    assert len(result.transactions) == 2
    assert result.tier_used == 'rules'


def test_extraction_engine_selects_tier2():
    from app.extraction.extraction_engine import ExtractionEngine
    
    # SBI format should use Tier 2
    text = """03/06/2026 03/06/2026 UPI/CR/652032424626/Google
C/YESB/googleclou/Refun 2.00 1742.14"""
    
    engine = ExtractionEngine()
    result = engine.extract(text, bank_code='sbi')
    
    assert len(result.transactions) == 1
    assert result.tier_used == 'template'
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass
from typing import List, Optional
from app.models import Transaction
from app.extraction.tier1_rules import extract_with_rules
from app.extraction.tier2_templates import extract_with_template, load_template

@dataclass
class ExtractionResult:
    transactions: List[Transaction]
    tier_used: str  # 'rules' | 'template' | 'ai' | 'human'
    confidence: float
    warnings: List[str]

class ExtractionEngine:
    """Orchestrates tiered extraction."""
    
    def extract(self, text: str, bank_code: str = 'unknown') -> ExtractionResult:
        """Extract transactions using the best available tier."""
        warnings = []
        
        # Tier 2: Try template first if bank is known
        if bank_code != 'unknown' and load_template(bank_code):
            transactions = extract_with_template(text, bank_code)
            if transactions:
                avg_confidence = sum(t.confidence_score for t in transactions) / len(transactions)
                return ExtractionResult(
                    transactions=transactions,
                    tier_used='template',
                    confidence=avg_confidence,
                    warnings=warnings,
                )
        
        # Tier 1: Try rule-based extraction
        transactions = extract_with_rules(text)
        if transactions:
            avg_confidence = sum(t.confidence_score for t in transactions) / len(transactions)
            return ExtractionResult(
                transactions=transactions,
                tier_used='rules',
                confidence=avg_confidence,
                warnings=warnings,
            )
        
        # Tier 3: AI extraction (placeholder for now)
        # TODO: Implement AI extraction in Phase 3
        
        # No transactions found
        warnings.append("No transactions detected. The PDF may be scanned or in an unusual format.")
        return ExtractionResult(
            transactions=[],
            tier_used='none',
            confidence=0.0,
            warnings=warnings,
        )
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_extraction_engine.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/extraction/extraction_engine.py tests/test_extraction_engine.py
git commit -m "feat: add extraction engine orchestrator with tier selection"
```

---

### Task 6: Add Validation Engine

**Files:**
- Create: `app/validation/balance_checker.py`
- Create: `app/validation/date_validator.py`
- Create: `app/validation/duplicate_detector.py`
- Create: `app/validation/validation_engine.py`
- Test: `tests/test_validation.py`

**Interfaces:**
- Consumes: List of `Transaction` objects
- Produces: Validation results with issues

- [ ] **Step 1: Write the failing test**

```python
def test_validate_transactions():
    from app.validation.validation_engine import ValidationEngine
    from app.models import Transaction
    from datetime import date
    
    transactions = [
        Transaction(id='1', date=date(2026, 1, 15), amount=15.99, description='Netflix'),
        Transaction(id='2', date=date(2026, 2, 15), amount=15.99, description='Netflix'),
        Transaction(id='3', date=date(2026, 3, 15), amount=15.99, description='Netflix'),
    ]
    
    engine = ValidationEngine()
    result = engine.validate(transactions)
    
    assert result.is_valid == True
    assert len(result.issues) == 0
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from datetime import date, datetime

@dataclass
class ValidationIssue:
    transaction_id: str
    issue_type: str  # 'balance_mismatch' | 'future_date' | 'duplicate' | 'negative_amount'
    severity: str  # 'error' | 'warning' | 'info'
    message: str

@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue]
    checked_count: int
    issue_count: int

class ValidationEngine:
    """Validates extracted transactions."""
    
    def validate(self, transactions: List[Transaction]) -> ValidationResult:
        """Validate a list of transactions."""
        issues = []
        
        # Check for future dates
        today = date.today()
        for txn in transactions:
            if txn.date > today:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='future_date',
                    severity='warning',
                    message=f'Transaction date {txn.date} is in the future',
                ))
        
        # Check for negative amounts
        for txn in transactions:
            if txn.amount < 0:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='negative_amount',
                    severity='error',
                    message=f'Transaction has negative amount: {txn.amount}',
                ))
        
        # Check for duplicates
        seen = set()
        for txn in transactions:
            key = (txn.date, txn.amount, txn.description.upper())
            if key in seen:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='duplicate',
                    severity='warning',
                    message=f'Possible duplicate transaction',
                ))
            seen.add(key)
        
        return ValidationResult(
            is_valid=all(i.severity != 'error' for i in issues),
            issues=issues,
            checked_count=len(transactions),
            issue_count=len(issues),
        )
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_validation.py::test_validate_transactions -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/validation/ tests/test_validation.py
git commit -m "feat: add validation engine for transaction verification"
```

---

### Task 7: Add Confidence Scorer

**Files:**
- Create: `app/confidence/confidence_scorer.py`
- Test: `tests/test_confidence.py`

**Interfaces:**
- Consumes: Transaction, ExtractionResult
- Produces: Updated Transaction with confidence scores

- [ ] **Step 1: Write the failing test**

```python
def test_score_transaction_confidence():
    from app.confidence.confidence_scorer import ConfidenceScorer
    from app.models import Transaction
    from datetime import date
    
    txn = Transaction(
        id='1',
        date=date(2026, 1, 15),
        amount=15.99,
        description='NETFLIX.COM',
        extraction_method='rules',
        confidence_score=0.0,
    )
    
    scorer = ConfidenceScorer()
    scored_txn = scorer.score_transaction(txn)
    
    assert scored_txn.confidence_score > 0.8
    assert 'date' in scored_txn.field_confidences
    assert 'amount' in scored_txn.field_confidences
```

- [ ] **Step 2: Write implementation**

```python
from app.models import Transaction

class ConfidenceScorer:
    """Calculates field-level confidence scores."""
    
    def score_transaction(self, txn: Transaction) -> Transaction:
        """Score a transaction's confidence."""
        field_confidences = {}
        
        # Date confidence
        if txn.date:
            field_confidences['date'] = 0.95 if txn.extraction_method == 'rules' else 0.85
        
        # Amount confidence
        if txn.amount and txn.amount > 0:
            field_confidences['amount'] = 0.95 if txn.extraction_method == 'rules' else 0.85
        
        # Description confidence
        if txn.description and len(txn.description) >= 3:
            field_confidences['description'] = 0.90
        else:
            field_confidences['description'] = 0.50
        
        # Merchant confidence
        if txn.merchant_normalized:
            field_confidences['merchant'] = 0.85
        else:
            field_confidences['merchant'] = 0.50
        
        # Balance confidence
        if txn.balance and txn.balance > 0:
            field_confidences['balance'] = 0.90
        else:
            field_confidences['balance'] = 0.50
        
        # Calculate overall confidence
        if field_confidences:
            overall = sum(field_confidences.values()) / len(field_confidences)
        else:
            overall = 0.0
        
        # Update transaction
        txn.confidence_score = round(overall, 3)
        txn.field_confidences = field_confidences
        
        # Set review flag if confidence is low
        if overall < 0.7:
            txn.needs_review = True
            txn.review_reason = 'Low confidence score'
        
        return txn
    
    def score_transactions(self, transactions: list) -> list:
        """Score a list of transactions."""
        return [self.score_transaction(txn) for txn in transactions]
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_confidence.py::test_score_transaction_confidence -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/confidence/confidence_scorer.py tests/test_confidence.py
git commit -m "feat: add confidence scorer for transaction quality"
```

---

### Task 8: Integrate New Pipeline with Existing API

**Files:**
- Modify: `app/main.py`

**Interfaces:**
- Consumes: New extraction engine, validation, confidence
- Produces: Updated analyze_statement function

- [ ] **Step 1: Update imports in main.py**

```python
from app.understanding.document_classifier import classify_document
from app.extraction.extraction_engine import ExtractionEngine
from app.validation.validation_engine import ValidationEngine
from app.confidence.confidence_scorer import ConfidenceScorer
```

- [ ] **Step 2: Update analyze_statement function**

```python
async def analyze_statement(file_path: str, user_id: str, db: Session, analysis_id: str = None) -> AnalysisResult:
    """Main analysis pipeline with new extraction engine."""
    if not analysis_id:
        analysis_id = str(uuid.uuid4())
    warnings = []

    text = parse_pdf(file_path)

    if not text or len(text.strip()) < 10:
        result = AnalysisResult(
            analysis_id=analysis_id,
            status="error",
            warnings=[{"type": "parser", "message": "Could not extract text from PDF."}],
        )
        update_analysis_status(db, analysis_id, "error", warnings=[{"type": "parser", "message": "Could not extract text from PDF."}])
        return result

    # Classify document
    doc_info = classify_document(text)
    
    # Extract transactions using new engine
    engine = ExtractionEngine()
    extraction_result = engine.extract(text, bank_code=doc_info.bank_code)
    
    transactions = extraction_result.transactions
    warnings.extend([{"type": "parser", "message": w} for w in extraction_result.warnings])
    
    # Validate transactions
    validator = ValidationEngine()
    validation_result = validator.validate(transactions)
    warnings.extend([{"type": "validation", "message": i.message} for i in validation_result.issues])
    
    # Score confidence
    scorer = ConfidenceScorer()
    transactions = scorer.score_transactions(transactions)
    
    if not transactions:
        result = AnalysisResult(
            analysis_id=analysis_id,
            status="complete",
            warnings=warnings,
        )
        update_analysis_status(db, analysis_id, "complete", warnings=warnings)
        return result

    # Continue with existing pipeline...
    # (rest of the function remains the same)
```

- [ ] **Step 3: Run tests to verify everything works**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/main.py
git commit -m "feat: integrate new extraction pipeline with existing API"
```

---

### Task 9: Integration Test with Real PDFs

**Files:**
- Create: `tests/test_integration_pipeline.py`

**Interfaces:**
- Consumes: Real PDF files
- Produces: Verification of end-to-end pipeline

- [ ] **Step 1: Write integration test**

```python
import pytest
from app.parsers.pdf_parser import parse_pdf
from app.understanding.document_classifier import classify_document
from app.extraction.extraction_engine import ExtractionEngine
from app.validation.validation_engine import ValidationEngine
from app.confidence.confidence_scorer import ConfidenceScorer

def test_sbi_pipeline():
    """Test full pipeline with SBI statement."""
    pdf_path = r'A:\innovahack\DepositAccountStatement_unlocked.pdf'
    
    text = parse_pdf(pdf_path)
    assert len(text) > 100
    
    # Classify
    doc_info = classify_document(text)
    assert doc_info.bank_code == 'sbi'
    
    # Extract
    engine = ExtractionEngine()
    result = engine.extract(text, bank_code=doc_info.bank_code)
    assert len(result.transactions) > 0
    assert result.tier_used == 'template'
    
    # Validate
    validator = ValidationEngine()
    validation = validator.validate(result.transactions)
    assert validation.is_valid
    
    # Score confidence
    scorer = ConfidenceScorer()
    scored = scorer.score_transactions(result.transactions)
    for txn in scored:
        assert txn.confidence_score > 0.7


def test_unknown_bank_pipeline():
    """Test pipeline with unknown bank format."""
    text = """01/15/2026 | $15.99 | NETFLIX.COM
02/15/2026 | $9.99 | SPOTIFY PREMIUM
03/15/2026 | $54.99 | ADOBE CREATIVE CLOUD"""
    
    # Classify
    doc_info = classify_document(text)
    assert doc_info.bank_code == 'unknown'
    
    # Extract
    engine = ExtractionEngine()
    result = engine.extract(text, bank_code=doc_info.bank_code)
    assert len(result.transactions) == 3
    assert result.tier_used == 'rules'
```

- [ ] **Step 2: Run integration test**

Run: `pytest tests/test_integration_pipeline.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_integration_pipeline.py
git commit -m "test: add integration tests for new extraction pipeline"
```

---

### Task 10: Final Verification

**Files:**
- Run full test suite
- Verify real PDF extraction works

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Manual verification**

```bash
python -c "
from app.parsers.pdf_parser import parse_pdf
from app.understanding.document_classifier import classify_document
from app.extraction.extraction_engine import ExtractionEngine

# Test SBI
text = parse_pdf(r'A:\innovahack\DepositAccountStatement_unlocked.pdf')
doc = classify_document(text)
engine = ExtractionEngine()
result = engine.extract(text, bank_code=doc.bank_code)
print(f'SBI: {len(result.transactions)} transactions, tier={result.tier_used}')

# Test unknown format
text2 = '01/15/2026 | \$15.99 | NETFLIX.COM'
result2 = engine.extract(text2, bank_code='unknown')
print(f'Unknown: {len(result2.transactions)} transactions, tier={result2.tier_used}')
"
```

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete Phase 1 - Core Extraction Pipeline

- Add document classifier for bank detection
- Add Tier 1 rule-based extraction
- Add Tier 2 template-based extraction (SBI, HDFC)
- Add extraction engine orchestrator
- Add validation engine
- Add confidence scorer
- Integrate with existing API
- Add integration tests"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Extend Transaction Model | 15 min |
| 2 | Add Document Classifier | 30 min |
| 3 | Add Tier 1 Rule-Based Extraction | 45 min |
| 4 | Add Bank Template System | 45 min |
| 5 | Add Extraction Engine Orchestrator | 30 min |
| 6 | Add Validation Engine | 30 min |
| 7 | Add Confidence Scorer | 20 min |
| 8 | Integrate with Existing API | 30 min |
| 9 | Integration Tests | 30 min |
| 10 | Final Verification | 15 min |
| **Total** | | **~5.5 hours** |

---

## Expected Results

After Phase 1, the system will:
1. Classify bank statements automatically
2. Extract transactions from SBI, HDFC, and unknown formats
3. Validate extracted transactions
4. Score confidence for each field
5. Route low-confidence cases for review
6. Work with existing API endpoints
