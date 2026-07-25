import re
import uuid
from datetime import datetime
from typing import List, Optional, Tuple
from app.models import Transaction


DATE_PATTERNS = [
    (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', 'YYYY-MM-DD'),
    (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', 'MM/DD/YYYY'),
    (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})', 'MM/DD/YY'),
]

MONTH_NAMES = {
    'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
    'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
    'may': 5, 'jun': 6, 'june': 6,
    'jul': 7, 'july': 7, 'aug': 8, 'august': 8,
    'sep': 9, 'september': 9, 'oct': 10, 'october': 10,
    'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
}

AMOUNT_PATTERN = r'[\$₹€£]?\s*[\d,]+\.?\d*'

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


def parse_date(date_str: str) -> Optional[datetime]:
    """Handle multiple date formats including edge cases."""
    date_str = date_str.strip()

    m = re.match(r'(\d{1,2})\s+(\w+)\s+(\d{4})', date_str)
    if m:
        day, month_name, year = m.groups()
        month = MONTH_NAMES.get(month_name.lower()[:3])
        if month:
            try:
                return datetime(int(year), month, int(day))
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
    cleaned = re.sub(r'[₹€£]', '', amount_str).strip()
    cleaned = cleaned.replace(',', '')
    cleaned = re.sub(r'[^\d.]', '', cleaned)

    try:
        return float(cleaned)
    except ValueError:
        return None


def categorize_transaction(description: str) -> str:
    """Basic categorization based on merchant keywords."""
    desc_lower = description.lower()

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


def extract_transactions_from_text(text: str) -> Tuple[List[Transaction], List[dict]]:
    """Parse raw text into structured transactions using regex.
    
    Returns:
        Tuple of (transactions, warnings) where warnings is a list of
        dicts with 'type' and 'message' keys.
    """
    transactions = []
    warnings = []
    lines = text.split('\n')
    lines = [l.strip() for l in lines]

    SKIP_KEYWORDS = ['account', 'statement', 'balance', 'summary', 'total', 'deposit',
                     'date', 'description', 'amount', 'period', 'ending']

    unparseable_lines = 0
    zero_amount_count = 0

    i = 0
    while i < len(lines):
        line = lines[i]
        if not line or len(line) < 5:
            i += 1
            continue

        line_lower = line.lower()
        if any(kw in line_lower for kw in SKIP_KEYWORDS):
            i += 1
            continue

        pipe_parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(pipe_parts) >= 3:
            date_str, amount_str, desc = pipe_parts[0], pipe_parts[1], pipe_parts[2]
            parsed_date = parse_date(date_str)
            amount = parse_amount(amount_str)
            if parsed_date and amount is not None and len(desc) >= 2:
                if amount == 0:
                    zero_amount_count += 1
                    i += 1
                    continue
                category = categorize_transaction(desc)
                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=parsed_date.date(),
                    amount=abs(amount),
                    description=desc.upper(),
                    category=category,
                ))
                i += 1
                continue

        parsed_date = parse_date(line)
        if parsed_date and i + 2 < len(lines):
            desc_line = lines[i + 1]
            amount_line = lines[i + 2]

            if (desc_line and len(desc_line) >= 2
                    and not parse_date(desc_line)
                    and re.search(AMOUNT_PATTERN, amount_line)):
                amount = parse_amount(amount_line)
                if amount is not None:
                    if amount == 0:
                        zero_amount_count += 1
                        i += 3
                        continue
                    category = categorize_transaction(desc_line)
                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=parsed_date.date(),
                        amount=abs(amount),
                        description=desc_line.upper(),
                        category=category,
                    ))
                    i += 3
                    continue

        amount_match = re.search(AMOUNT_PATTERN, line)
        if not amount_match:
            i += 1
            continue

        amount = parse_amount(amount_match.group(0))
        if amount is None or amount <= 0:
            if amount == 0:
                zero_amount_count += 1
            i += 1
            continue

        line_without_amount = line[:amount_match.start()] + line[amount_match.end():]

        parsed_date = None
        date_match = None
        for pattern, _ in DATE_PATTERNS:
            date_match = re.search(pattern, line_without_amount)
            if date_match:
                parsed_date = parse_date(date_match.group(0))
                if parsed_date:
                    break

        if not parsed_date:
            i += 1
            continue

        description = line_without_amount
        if date_match:
            description = description[:date_match.start()] + description[date_match.end():]
        description = re.sub(r'\s+', ' ', description).strip()
        description = re.sub(r'^[\s\-–—|/\\:]+|[\s\-–—|/\\:]+$', '', description)

        if len(description) < 2:
            i += 1
            continue

        category = categorize_transaction(description)

        transactions.append(Transaction(
            id=str(uuid.uuid4()),
            date=parsed_date.date(),
            amount=abs(amount),
            description=description.upper(),
            category=category,
        ))
        i += 1

    if zero_amount_count > 0:
        warnings.append({
            "type": "quality",
            "message": f"{zero_amount_count} transaction(s) had $0.00 amount and were excluded"
        })

    return transactions, warnings


def extract_transactions(text: str) -> Tuple[List[Transaction], List[dict]]:
    """Parse raw text into structured transactions with warnings."""
    return extract_transactions_from_text(text)
