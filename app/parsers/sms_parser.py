import re
from datetime import date, timedelta
from typing import List, Optional


CURRENCY_SYMBOLS = r'[\$₹€£]'


def parse_relative_date(text: str) -> Optional[date]:
    """Convert relative date strings to actual dates."""
    text = text.strip().lower()
    today = date.today()

    if text in ('today', 'now'):
        return today
    if text == 'yesterday':
        return today - timedelta(days=1)

    match = re.match(r'(\d+)\s*days?\s*ago', text)
    if match:
        return today - timedelta(days=int(match.group(1)))

    match = re.match(r'(\d+)\s*weeks?\s*ago', text)
    if match:
        return today - timedelta(weeks=int(match.group(1)))

    return None


def parse_absolute_date(text: str) -> Optional[date]:
    """Parse absolute date strings in common formats."""
    text = text.strip()

    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%d %b %Y', '%B %d, %Y'):
        try:
            return date.strptime(text, fmt)
        except ValueError:
            continue
    return None


def extract_amount(text: str) -> Optional[float]:
    """Extract monetary amount from text, handling multiple currencies."""
    cleaned = text.strip()
    cleaned = re.sub(r'Rs\.?\s*', '', cleaned)
    cleaned = re.sub(r'[₹€£\$]', '', cleaned)
    cleaned = cleaned.replace(',', '')
    cleaned = cleaned.strip()

    match = re.search(r'(\d+\.?\d*)', cleaned)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def extract_description(text: str, amount_str: str, date_str: Optional[str]) -> str:
    """Extract merchant/description by removing amount and date from the text."""
    desc = text

    if amount_str:
        desc = desc.replace(amount_str, ' ', 1)

    if date_str:
        desc = desc.replace(date_str, ' ', 1)

    for keyword in ('charged', 'transaction', 'debited', 'payment', 'processed',
                     'of', 'for', 'at', 'to', 'from', 'your', 'account', 'card',
                     'debit', 'credit', 'Rs.', 'Rs', 'on'):
        desc = re.sub(rf'\b{re.escape(keyword)}\b', ' ', desc, flags=re.IGNORECASE)

    desc = re.sub(r'[₹€£\$,]', ' ', desc)
    desc = re.sub(r'\s+', ' ', desc).strip()

    if len(desc) < 2:
        return 'Unknown'

    return desc.upper()


def parse_sms(text: str) -> List[dict]:
    """Parse a single SMS message into a list of transaction dicts.

    Returns list of dicts with keys: date, amount, description.
    Returns empty list if no transaction is found.
    """
    if not text or not text.strip():
        return []

    results = []

    amount_pattern = re.compile(
        r'(Rs\.?\s*[\d,]+\.?\d*|[\$₹€£]\s*[\d,]+\.?\d*|\d+[\d,]*\.?\d*)'
    )

    date_pattern = re.compile(
        r'(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}'
        r'|\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},\s+\d{4})',
        re.IGNORECASE
    )

    relative_date_pattern = re.compile(
        r'\b(today|yesterday|\d+\s*days?\s*ago|\d+\s*weeks?\s*ago)\b',
        re.IGNORECASE
    )

    amount_match = amount_pattern.search(text)
    if not amount_match:
        return []

    amount_str = amount_match.group(0)
    amount = extract_amount(amount_str)
    if amount is None or amount <= 0:
        return []

    resolved_date = None

    date_match = date_pattern.search(text)
    if date_match:
        resolved_date = parse_absolute_date(date_match.group(0))

    if resolved_date is None:
        rel_match = relative_date_pattern.search(text)
        if rel_match:
            resolved_date = parse_relative_date(rel_match.group(0))

    if resolved_date is None:
        resolved_date = date.today()

    description = extract_description(text, amount_str, date_match.group(0) if date_match else None)

    results.append({
        'date': resolved_date.isoformat(),
        'amount': round(amount, 2),
        'description': description,
    })

    return results


def parse_sms_batch(text: str) -> List[dict]:
    """Parse multiple SMS messages (newline-separated) into transactions."""
    if not text or not text.strip():
        return []

    results = []
    for line in text.split('\n'):
        line = line.strip()
        if line:
            results.extend(parse_sms(line))

    return results
