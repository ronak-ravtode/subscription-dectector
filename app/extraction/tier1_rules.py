import re
from typing import List, Optional
from app.models import Transaction
import uuid
from datetime import date, datetime

# Date patterns with month names or numbers
DATE_PATTERNS = [
    (r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})', 'DD/MM/YYYY'),
    (r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})', 'YYYY-MM-DD'),
    (r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})', 'DD/MM/YY'),
    (r'(\d{1,2})[\s/.-]+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s/.-]+(\d{2,4}))?', 'DD_MON_YYYY'),
]

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def detect_date_format(text: str) -> str:
    """Auto-detect date format from text."""
    for pattern, fmt in DATE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for group in matches:
            if fmt == 'DD_MON_YYYY':
                return 'DD_MON_YYYY'
            if len(group) == 3 and fmt != 'YYYY-MM-DD':
                try:
                    d, m, y = int(group[0]), int(group[1]), int(group[2])
                    if d > 12:
                        return 'DD/MM/YYYY'
                    if m > 12:
                        return 'MM/DD/YYYY'
                except ValueError:
                    pass
    return 'DD/MM/YYYY'


def parse_date(date_str: str, format_hint: str = 'DD/MM/YYYY', default_year: Optional[int] = None) -> Optional[date]:
    """Parse date string flexibly."""
    date_str = date_str.strip()
    if not default_year:
        default_year = date.today().year

    # Try Month name date: e.g., 15 Jan 2026 or 15-Jan-2026 or 15-Jan
    mon_match = re.search(r'(\d{1,2})[\s/.-]+([A-Za-z]{3})[A-Za-z]*(?:[\s/.-]+(\d{2,4}))?', date_str)
    if mon_match:
        try:
            day = int(mon_match.group(1))
            mon_str = mon_match.group(2).lower()[:3]
            month = MONTH_MAP.get(mon_str, 1)
            yr_str = mon_match.group(3)
            if yr_str:
                year = int(yr_str)
                year = year + 2000 if year < 100 else year
            else:
                year = default_year
            return date(year, month, day)
        except ValueError:
            pass

    # Try numeric date patterns
    numeric_match = re.search(r'(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})', date_str)
    if numeric_match:
        p1, p2, p3 = int(numeric_match.group(1)), int(numeric_match.group(2)), int(numeric_match.group(3))
        try:
            if p1 > 1000:  # YYYY-MM-DD
                return date(p1, p2, p3)
            if format_hint == 'MM/DD/YYYY':
                return date(p3 if p3 > 50 else p3 + 2000, p1, p2)
            else:  # Default DD/MM/YYYY
                year = p3 + 2000 if p3 < 50 else p3
                return date(year, p2, p1)
        except ValueError:
            pass

    return None


def parse_amount(amount_str: str) -> Optional[float]:
    """Parse amount string to float."""
    if not amount_str:
        return None
    cleaned = re.sub(r'[₹€£$]', '', amount_str).strip()
    cleaned = cleaned.replace(',', '')
    cleaned = re.sub(r'\s*(DR|CR|Dr|Cr|debit|credit)$', '', cleaned, flags=re.IGNORECASE).strip()
    try:
        val = float(cleaned)
        if 0 < val <= 500000.0:
            return val
        return None
    except ValueError:
        return None


def is_header_line(line: str) -> bool:
    """Check if line is a table header row or page footer."""
    line_lower = line.lower()
    
    # Pure table header rows
    if ('date' in line_lower and ('particulars' in line_lower or 'description' in line_lower or 'details' in line_lower) and 'balance' in line_lower) or \
       ('txn date' in line_lower and 'particulars' in line_lower) or \
       ('narration' in line_lower and 'withdrawal' in line_lower) or \
       ('opening balance' in line_lower) or ('closing balance' in line_lower) or \
       ('total credits' in line_lower) or ('total debits' in line_lower) or \
       ('synthetic' in line_lower) or ('generated benchmark' in line_lower) or \
       ('page ' in line_lower and ' of ' in line_lower) or \
       ('statement period' in line_lower) or ('account number' in line_lower and 'date' in line_lower):
        return True
    return False


def merge_continuation_lines(lines: List[str]) -> List[str]:
    """Merge lines without dates into previous transaction line."""
    merged = []
    current = ""

    date_regex = re.compile(r'(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}|\d{1,2}[\s/.-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s/.-]+\d{2,4})?)', re.IGNORECASE)

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue

        if date_regex.search(line_str):
            if current:
                merged.append(current)
            current = line_str
        else:
            if current:
                current += " " + line_str

    if current:
        merged.append(current)

    return merged


def extract_transactions_from_line(line: str, format_hint: str, default_year: Optional[int] = None) -> List[Transaction]:
    """Extract transaction from a line using multi-strategy regex parsing."""
    transactions = []
    if is_header_line(line):
        return transactions

    # Strategy 1: Pipe / Tab delimiter splitting
    delimiters = ['|', '\t']
    for delim in delimiters:
        if delim in line:
            parts = [p.strip() for p in line.split(delim) if p.strip()]
            if len(parts) >= 3:
                # Find part that matches a date
                date_idx = -1
                parsed_date = None
                for i, part in enumerate(parts[:3]):
                    parsed_date = parse_date(part, format_hint, default_year=default_year)
                    if parsed_date:
                        date_idx = i
                        break
                
                if parsed_date and date_idx != -1:
                    remaining = [p for i, p in enumerate(parts) if i != date_idx]
                    amounts = []
                    desc_parts = []
                    for r in remaining:
                        amt = parse_amount(r)
                        if amt is not None:
                            amounts.append(amt)
                        else:
                            desc_parts.append(r)
                    
                    if amounts and desc_parts:
                        desc = " ".join(desc_parts).strip()
                        amount = amounts[0]
                        txn_type = "debit"
                        if "CR" in line.upper() or "CREDIT" in line.upper():
                            txn_type = "credit"

                        transactions.append(Transaction(
                            id=str(uuid.uuid4()),
                            date=parsed_date,
                            amount=abs(amount),
                            description=desc,
                            merchant_normalized=desc,
                            transaction_type=txn_type,
                            confidence_score=0.95,
                            extraction_method='rules',
                        ))
                        return transactions

    # Strategy 2: Match date + numbers + narration in free-text lines
    date_match = re.search(r'(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}|\d{1,2}[\s/.-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s/.-]+\d{2,4})?)', line, re.IGNORECASE)
    if date_match:
        parsed_date = parse_date(date_match.group(0), format_hint, default_year=default_year)
        if parsed_date:
            # Find standalone numbers with decimals/commas in the line (not embedded in text/VPAs)
            numbers_found = re.findall(r'(?<![a-zA-Z0-9_])[\$₹€£]?\s*([\d,]+\.\d{2})\b', line)
            if not numbers_found:
                numbers_found = re.findall(r'(?<![a-zA-Z0-9_])[\$₹€£]?\s*([\d,]{2,}\b)', line)

            parsed_amounts = []
            for num_str in numbers_found:
                parsed_amt = parse_amount(num_str)
                if parsed_amt is not None and parsed_amt > 0:
                    parsed_amounts.append(parsed_amt)

            if parsed_amounts:
                amount = parsed_amounts[0]
                balance = parsed_amounts[-1] if len(parsed_amounts) > 1 else 0.0

                desc = line
                desc = desc.replace(date_match.group(0), ' ')
                for num_str in numbers_found:
                    desc = desc.replace(num_str, ' ')

                desc = re.sub(r'[₹$€£]', ' ', desc)
                desc = re.sub(r'\bSBX\d+\b', ' ', desc, flags=re.IGNORECASE)
                desc = re.sub(r'\b(DR|CR|Dr|Cr|Debit|Credit)\b', '', desc, flags=re.IGNORECASE)
                desc = re.sub(r'\s+', ' ', desc).strip()
                desc = re.sub(r'^[\s\-–—|/\\:]+|[\s\-–—|/\\:]+$', '', desc)

                from app.extractors.transaction_extractor import clean_description
                cleaned_desc = clean_description(desc if len(desc) >= 2 else line)

                if len(cleaned_desc) >= 2:
                    txn_type = "credit" if ("CR" in line.upper() or "CREDIT" in line.upper()) else "debit"
                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=parsed_date,
                        amount=abs(amount),
                        description=cleaned_desc,
                        raw_description=line.strip(),
                        merchant_normalized=cleaned_desc,
                        transaction_type=txn_type,
                        balance=balance,
                        confidence_score=0.85,
                        extraction_method='rules',
                    ))

    return transactions


def extract_with_rules(text: str) -> List[Transaction]:
    """Extract transactions using robust multi-bank rule parsing."""
    if not text or len(text.strip()) < 10:
        return []

    format_hint = detect_date_format(text)
    lines = text.split('\n')
    merged_lines = merge_continuation_lines(lines)

    year_matches = re.findall(r'\b(20\d{2})\b', text[:1000])
    default_year = int(year_matches[0]) if year_matches else date.today().year

    transactions = []
    for line in merged_lines:
        if len(line.strip()) < 10:
            continue
        txns = extract_transactions_from_line(line, format_hint, default_year=default_year)
        transactions.extend(txns)

    return transactions
