import re
import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from app.models import Transaction


DATE_PATTERNS = [
    (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', 'YYYY-MM-DD'),
    (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', 'MM/DD/YYYY'),
    (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})', 'MM/DD/YY'),
    (r'(\d{1,2})[\s/.-]+([A-Za-z]{3})[a-z]*(?:[\s/.-]+(\d{2,4}))?', 'DD_MON_YYYY'),
]

MONTH_NAMES = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
    'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
    'may': 5, 'jun': 6, 'june': 6,
    'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
    'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
}

AMOUNT_PATTERN = r'(?<![a-zA-Z0-9_/.])[\$₹€£]?\s*[\d,]+(?:\.\d{1,2})?\b(?!/)'

MERCHANT_CATEGORIES = {
    'netflix': 'entertainment',
    'spotify': 'entertainment',
    'adobe': 'software',
    'microsoft': 'software',
    'amazon prime': 'entertainment',
    'youtube': 'entertainment',
    'apple': 'software',
    'google': 'software',
    'hulu': 'entertainment',
    'disney': 'entertainment',
    'hbo': 'entertainment',
    'dropbox': 'software',
    'slack': 'software',
    'zoom': 'software',
    'github': 'software',
    'figma': 'software',
    'canva': 'software',
}


def parse_date(date_str: str, format_hint: str = 'DD/MM/YYYY', default_year: Optional[int] = None) -> Optional[datetime]:
    """Handle multiple date formats including edge cases.

    Args:
        date_str: Date string to parse.
        format_hint: Optional 'DD/MM/YYYY' or 'MM/DD/YYYY' to disambiguate
            when both day and month are <= 12.
        default_year: Optional year to use if date_str doesn't contain one.
    """
    date_str = date_str.strip()
    if not default_year:
        default_year = datetime.now().year

    m = re.match(r'(\d{1,2})[\s/.-]+([A-Za-z]{3})[a-z]*(?:[\s/.-]+(\d{2,4}))?', date_str, re.IGNORECASE)
    if m:
        day, month_name, year = m.groups()
        month = MONTH_NAMES.get(month_name.lower()[:3])
        if year:
            yr = int(year)
            yr = yr + 2000 if yr < 100 else yr
        else:
            yr = default_year
        if month:
            try:
                return datetime(yr, month, int(day))
            except ValueError:
                pass

    m = re.match(r'(\w+)\s+(\d{1,2}),?\s+(\d{4})', date_str)
    if m:
        month_name, day, year = m.groups()
        month = MONTH_NAMES.get(month_name.lower()[:3])
        if month:
            try:
                return datetime(int(year), month, int(day))
            except ValueError:
                pass

    for pattern, fmt in DATE_PATTERNS:
        match = re.match(pattern, date_str)
        if match:
            groups = match.groups()
            try:
                if fmt == 'YYYY-MM-DD':
                    return datetime(int(groups[0]), int(groups[1]), int(groups[2]))
                elif fmt == 'MM/DD/YYYY':
                    a, b, year = int(groups[0]), int(groups[1]), int(groups[2])
                    if a > 12:
                        return datetime(year, b, a)
                    elif b > 12:
                        return datetime(year, a, b)
                    elif format_hint == 'DD/MM/YYYY':
                        return datetime(year, b, a)
                    else:
                        return datetime(year, a, b)
                elif fmt == 'MM/DD/YY':
                    year = int(groups[2])
                    year = year + 2000 if year < 50 else year + 1900
                    return datetime(year, int(groups[0]), int(groups[1]))
            except ValueError:
                continue

    return None


def parse_amount(amount_str: str) -> Optional[float]:
    """Handle currency symbols, commas, decimals."""
    cleaned = re.sub(r'[₹€£$]', '', amount_str).strip()
    cleaned = cleaned.replace(',', '')
    cleaned = re.sub(r'[^\d.]', '', cleaned)

    try:
        val = float(cleaned)
        if 0 < val <= 500000.0:
            return val
        return None
    except ValueError:
        return None


COMMON_PERSON_NAMES = [
    'rajesh', 'ronak', 'ravtode', 'kumar', 'singh', 'sharma', 'patel', 'gupta', 'jain',
    'shah', 'verma', 'yadav', 'rao', 'nair', 'reddy', 'choudhary', 'das', 'mishra',
    'bhat', 'pandey', 'khushbu', 'rajendra', 'amit', 'priya', 'rahul', 'sneha', 'pooja',
    'anil', 'sunil', 'deepak', 'vikram', 'sanjay', 'rohit', 'neha', 'anjali', 'ravi'
]

COMMERCIAL_KEYWORDS = [
    'netflix', 'spotify', 'google', 'amazon', 'adobe', 'microsoft', 'apple', 'github',
    'figma', 'canva', 'slack', 'zoom', 'jio', 'airtel', 'swiggy', 'zomato', 'uber',
    'ola', 'hotstar', 'youtube', 'dropbox', 'icloud', 'notion', 'medium', 'hulu',
    'disney', 'hbo', 'electricity', 'insurance', 'recharge', 'bill', 'broadband'
]


def is_person_transfer(description: str) -> bool:
    """Detect if a transaction description corresponds to a personal P2P transfer."""
    if not description or not description.strip():
        return True

    desc_lower = description.lower()

    if any(kw in desc_lower for kw in COMMERCIAL_KEYWORDS):
        return False

    if any(name in desc_lower for name in COMMON_PERSON_NAMES):
        return True

    if any(h in desc_lower for h in ['mr ', 'mr.', 'mrs ', 'mrs.', 'shri ', 'smt ', 'dr ']):
        return True

    clean_words = [w for w in re.split(r'[\s/._]+', desc_lower) if len(w) > 2]
    if len(clean_words) >= 2 and not any(kw in desc_lower for kw in COMMERCIAL_KEYWORDS):
        if any(w in COMMON_PERSON_NAMES for w in clean_words):
            return True

    return False


def categorize_transaction(description: str) -> str:
    """Basic categorization based on merchant keywords."""
    desc_lower = description.lower()

    if is_person_transfer(description):
        return 'transfer'

    for merchant, category in MERCHANT_CATEGORIES.items():
        if merchant in desc_lower:
            return category

    if any(kw in desc_lower for kw in ['subscription', 'monthly', 'recurring']):
        return 'other'
    if any(kw in desc_lower for kw in ['utility', 'electric', 'gas', 'water']):
        return 'utilities'
    if any(kw in desc_lower for kw in ['insurance', 'premium']):
        return 'insurance'

    return 'other'


def detect_date_format(text: str) -> str:
    """Auto-detect date format from text content.

    Returns 'DD/MM/YYYY' if any day > 12, otherwise 'MM/DD/YYYY'.
    Defaults to 'DD/MM/YYYY' for Indian bank statements.
    """
    date_pattern = r'(\d{2})/(\d{2})/(\d{4})'
    matches = re.findall(date_pattern, text)

    for first, second, year in matches:
        first_int = int(first)
        second_int = int(second)

        if first_int > 12:
            return 'DD/MM/YYYY'
        if second_int > 12:
            return 'MM/DD/YYYY'

    return 'DD/MM/YYYY'


def extract_amount_from_description(line: str) -> Tuple[Optional[float], Optional[float]]:
    cleaned_line = re.sub(r'\*+.*$', '', line).strip()
    pattern = r'(?:Sent|Refun|Pay|Manda|UPIInt|UPI)?\s*(\d{1,7}\.\d{2})\s+(\d{1,8}\.\d{2})\s*$'
    match = re.search(pattern, cleaned_line)
    if match:
        amount = float(match.group(1))
        balance = float(match.group(2))
        if 0 < amount <= 500000.0:
            return (amount, balance)

    pattern_fb = r'(?:Sent|Refun|Pay|Manda|UPIInt|UPI)?\s*(\d{1,7}(?:\.\d{1,2})?)\s+(\d{1,8}(?:\.\d{1,2})?)\s*$'
    match_fb = re.search(pattern_fb, cleaned_line)
    if match_fb:
        try:
            amt = float(match_fb.group(1))
            bal = float(match_fb.group(2))
            if 0 < amt <= 500000.0:
                return (amt, bal)
        except ValueError:
            pass

    return (None, None)


ACTION_EXPANSIONS = {'Refun': 'Refund'}


BANK_CODES = {'YESB', 'ICIC', 'ICICI', 'SBIN', 'HDFC', 'UTIB', 'AXIS', 'BARB', 'OKICICI', 'OKAXIS', 'OKHDFC', 'OKSBI', 'PYTM', 'PAYTM', 'UJVN', 'KOTAK', 'IDBI'}


def clean_description(raw: str) -> str:
    """Clean raw narration/UPI string into a short, crisp merchant/payee name."""
    if not raw or not raw.strip():
        return "Unknown"

    s = re.sub(r'\*+\s*END OF STATEMENT.*', '', raw, flags=re.IGNORECASE).strip()
    s = re.sub(r'\*+\s*THIS IS COMPUTER GENERATED STATEMENT.*', '', s, flags=re.IGNORECASE).strip()

    # Try SBI UPI format: UPI/CR|DR/<ref>/<name>/<bank>/<vpa>/<action>
    parts = [p.strip() for p in s.split('/') if p.strip()]

    cr_dr_idx = -1
    for i, p in enumerate(parts):
        if p.upper() in ['CR', 'DR']:
            cr_dr_idx = i
            break

    if cr_dr_idx != -1 and len(parts) > cr_dr_idx + 1:
        next_part = parts[cr_dr_idx + 1]
        if re.match(r'^\d+$', next_part) and len(parts) > cr_dr_idx + 2:
            name_part = parts[cr_dr_idx + 2]
            vpa_part = parts[cr_dr_idx + 4] if len(parts) > cr_dr_idx + 4 else ""
            action_part = parts[cr_dr_idx + 5] if len(parts) > cr_dr_idx + 5 else ""
        else:
            name_part = next_part
            vpa_part = parts[cr_dr_idx + 3] if len(parts) > cr_dr_idx + 3 else ""
            action_part = parts[cr_dr_idx + 4] if len(parts) > cr_dr_idx + 4 else ""

        name_words = name_part.split()
        name = name_words[0] if name_words else ""
        res_parts = [name] if name else []
        if action_part in ACTION_EXPANSIONS:
            res_parts.append(ACTION_EXPANSIONS[action_part])
        elif 'gpay' in vpa_part.lower():
            res_parts.append("Gpay")
        elif 'paytm' in vpa_part.lower():
            res_parts.append("Paytm")
        res = ' '.join(res_parts).strip().title()
        if res:
            return res

    # General UPI / AEPS / POS / ACH format cleaning
    filtered = []
    for p in parts:
        p_clean = p.strip()
        if p_clean.upper() in ['UPI', 'CR', 'DR', 'AEPS', 'MT', 'POS', 'ACH', 'NEFT', 'RTGS', 'IMPS', 'SENT', 'REFUN', 'PAY']:
            continue
        if re.match(r'^\d{8,18}$', p_clean):
            continue
        if re.match(r'^\d{2}:\d{2}(:\d{2})?$', p_clean):
            continue
        filtered.append(p_clean)

    if not filtered:
        fallback = re.sub(r'^(UPI|AEPS|MT|POS|ACH|NEFT|RTGS|IMPS)[/\s]+', '', s, flags=re.IGNORECASE)
        fallback = re.sub(r'\b\d{8,18}\b', '', fallback)
        fallback = re.sub(r'\b\d{2}:\d{2}(:\d{2})?\b', '', fallback)
        fallback = re.sub(r'[₹$€£]', '', fallback)
        fallback = re.sub(r'\bSBX\d+\b', '', fallback, flags=re.IGNORECASE)
        fallback = re.sub(r'\s+', ' ', fallback).strip()
        return fallback.title() if fallback else raw.strip().title()

    if len(filtered) > 1 and filtered[-1].upper() in BANK_CODES:
        candidate = filtered[-2]
    else:
        candidate = filtered[0]

    if '@' in candidate:
        candidate = candidate.split('@')[0]

    cand_lower = candidate.lower()
    if cand_lower.startswith('paytmqr'):
        candidate = 'Paytm QR'
    elif cand_lower.startswith('gpay'):
        candidate = 'Google Pay'
    elif cand_lower.startswith('phonepe'):
        candidate = 'PhonePe'
    elif cand_lower.startswith('zomato'):
        candidate = 'Zomato'
    elif cand_lower.startswith('swiggy'):
        candidate = 'Swiggy'
    elif cand_lower.startswith('playstore'):
        candidate = 'Playstore'
    else:
        candidate = re.sub(r'-\d+$', '', candidate)
        candidate = re.sub(r'([a-zA-Z]{3,})\d+$', r'\1', candidate)
        candidate = re.sub(r'([a-zA-Z]+)\.([a-zA-Z]+)', r'\1 \2', candidate)

    candidate = re.sub(r'\s+', ' ', candidate).strip().title()
    return candidate if len(candidate) >= 2 else raw.strip().title()


def detect_transaction_type(raw_line: str) -> str:
    """Detect if transaction is credit or debit from UPI codes."""
    line_upper = raw_line.upper()

    if '/CR/' in line_upper or line_upper.endswith('/CR'):
        return 'credit'
    elif '/DR/' in line_upper or line_upper.endswith('/DR'):
        return 'debit'

    return 'unknown'


def merge_continuation_lines(lines: List[str]) -> List[str]:
    """Merge continuation lines (lines without dates) into previous line."""
    merged = []
    current = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if re.search(r'(\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}|\d{1,2}[\s/.-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s/.-]+\d{2,4})?)', line, re.IGNORECASE):
            if current:
                merged.append(current)
            current = line
        else:
            if current:
                current += " " + line
            else:
                continue

    if current:
        merged.append(current)

    return merged


def extract_transactions_from_text(text: str) -> Tuple[List[Transaction], List[dict]]:
    """Parse raw text into structured transactions using regex.

    Tries SBI format first (auto-detects date format, merges continuation
    lines, extracts amounts from description), then falls back to
    pipe-separated and generic single-line formats.

    Returns:
        Tuple of (transactions, warnings) where warnings is a list of
        dicts with 'type' and 'message' keys.
    """
    transactions = []
    warnings = []
    zero_amount_count = 0

    lines = [l.strip() for l in text.split('\n')]
    merged_lines = merge_continuation_lines(lines)
    date_format = detect_date_format(text)

    year_matches = re.findall(r'\b(20\d{2})\b', text[:1000])
    default_year = int(year_matches[0]) if year_matches else datetime.now().year

    for line in merged_lines:
        if not line or len(line) < 5:
            continue

        line_lower = line.lower()
        # Skip pure header lines
        if ('date' in line_lower and 'description' in line_lower and 'balance' in line_lower) or \
           ('txn date' in line_lower and 'particulars' in line_lower) or \
           ('narration' in line_lower and 'withdrawal' in line_lower) or \
           ('opening balance' in line_lower) or ('closing balance' in line_lower) or \
           ('statement period' in line_lower):
            continue

        # Try SBI format: first date is value date, second is posting date
        date_match = re.search(r'(\d{2}/\d{2}/\d{4})\s+(\d{2}/\d{2}/\d{4})\s+(.*)', line)
        if date_match:
            date_str, _, rest = date_match.groups()
            parsed_date = parse_date(date_str, format_hint=date_format, default_year=default_year)
            if parsed_date:
                amount, balance = extract_amount_from_description(rest)
                if amount is not None:
                    if amount == 0:
                        zero_amount_count += 1
                        continue
                    txn_type = detect_transaction_type(rest)
                    description = clean_description(rest)
                    category = categorize_transaction(description)
                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=parsed_date.date(),
                        amount=abs(amount),
                        description=description,
                        category=category,
                        transaction_type=txn_type,
                        raw_description=rest,
                        balance=balance if balance else 0.0,
                    ))
                    continue

        # Fallback: pipe-separated format
        pipe_parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(pipe_parts) >= 3:
            date_str, amount_str, desc = pipe_parts[0], pipe_parts[1], pipe_parts[2]
            parsed_date = parse_date(date_str, default_year=default_year)
            amount = parse_amount(amount_str)
            if parsed_date and amount is not None and len(desc) >= 2:
                if amount == 0:
                    zero_amount_count += 1
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

        # Fallback: generic single-line extraction
        amount_match = re.search(AMOUNT_PATTERN, line)
        if not amount_match:
            continue

        amount = parse_amount(amount_match.group(0))
        if amount is None or amount <= 0:
            if amount == 0:
                zero_amount_count += 1
            continue

        line_without_amount = line[:amount_match.start()] + line[amount_match.end():]

        parsed_date = None
        date_match = None
        for pattern, _ in DATE_PATTERNS:
            date_match = re.search(pattern, line_without_amount)
            if date_match:
                parsed_date = parse_date(date_match.group(0), default_year=default_year)
                if parsed_date:
                    break

        if not parsed_date:
            continue

        description = line_without_amount
        if date_match:
            description = description[:date_match.start()] + description[date_match.end():]
        description = re.sub(r'\s+', ' ', description).strip()
        description = re.sub(r'^[\s\-–—|/\\:]+|[\s\-–—|/\\:]+$', '', description)
        cleaned_desc = clean_description(description if len(description) >= 2 else line)
        if len(cleaned_desc) < 2:
            continue
        description = cleaned_desc

        category = categorize_transaction(description)

        transactions.append(Transaction(
            id=str(uuid.uuid4()),
            date=parsed_date.date(),
            amount=abs(amount),
            description=description.upper(),
            category=category,
        ))

    if zero_amount_count > 0:
        warnings.append({
            "type": "quality",
            "message": f"{zero_amount_count} transaction(s) had $0.00 amount and were excluded"
        })

    return transactions, warnings


def extract_transactions(text: str) -> Tuple[List[Transaction], List[dict]]:
    """Parse raw text into structured transactions with warnings."""
    return extract_transactions_from_text(text)
