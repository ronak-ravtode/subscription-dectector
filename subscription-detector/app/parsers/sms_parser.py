import re
from datetime import date, timedelta
from typing import List, Optional, Tuple


CURRENCY_SYMBOLS = r'[\$₹€£]'

# Bank sender prefix mapping: common Indian bank SMS sender IDs
BANK_SENDER_PREFIXES = {
    'VM-HDFCBK': 'HDFC Bank',
    'AD-HDFCBK': 'HDFC Bank',
    'AD-SBIUPI': 'SBI',
    'JD-SBIUPI': 'SBI',
    'JX-ICICIB': 'ICICI Bank',
    'VM-ICICIB': 'ICICI Bank',
    'AD-AXISBK': 'Axis Bank',
    'VM-AXISBK': 'Axis Bank',
    'BZ-INDUSB': 'IndusInd Bank',
    'VK-KOTAKB': 'Kotak Bank',
    'JM-KOTAKB': 'Kotak Bank',
}

# Smart filtering: patterns for SMS types to skip
SKIP_PATTERNS = [
    r'\b(otp|one\s*time\s*password)\b.*\d{4,6}',
    r'your\s+(otp|pin|code)\s+is\s+\d',
    r'available\s+balance',
    r'current\s+balance',
    r'ledger\s+balance',
    r'balance\s+is\b',
    r'your\s+balance\b',
    r'\b(get|avail|offer|discount|cashback)\b.*\b(credit\s*card|loan|insurance)\b',
    r'\b(apply\s+now|t&c|terms\s+apply)\b',
    r'sent\s+to\s+\w+\s+via\s+upi',
    r'received\s+from\s+\w+',
]

# Merchant extraction patterns
MERCHANT_PATTERNS = [
    r'\bat\s+(.+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',         # "at ADOBE on 25/07"
    r'\bto\s+(.+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',         # "to SPOTIFY on 25/07"
    r'\bfor\s+([A-Za-z][A-Za-z\s.]+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',  # "for NETFLIX on 25/07" (skip amounts)
    r'\bby\s+NEFT\s+(.+?)(?:\s+on\s+|\s*$)',               # "by NEFT NETFLIX INDIA"
    r'\bvia\s+Card\s+\w+\s+on\s+\S+\s+at\s+(.+?)$',       # "via Card XX1234 on 25-Jul at NETFLIX"
]

# Subscription classification signals
STRONG_SUBSCRIPTION_SIGNALS = [
    r'\bauto[\s-]*renew',
    r'\bsubscription\s+renewed',
    r'\bmonthly\s+plan',
    r'\bannual\s+plan',
    r'\brecurring\s+payment',
    r'\bplan\s+renewal',
]

WEAK_BILLING_SIGNALS = [
    r'\b(deducted|charged|debited|billed|spent|payment)\b',
]


def should_skip_sms(text: str) -> bool:
    """Check if SMS should be skipped (non-transaction)."""
    text_lower = text.lower()
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False


def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant name from SMS text."""
    for pattern in MERCHANT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            # Clean up common suffixes
            merchant = re.sub(r'\s+on\s+.*$', '', merchant)
            merchant = re.sub(r'\s+dated?\s+.*$', '', merchant)
            if len(merchant) >= 2:
                return merchant.upper()
    return None


def is_subscription_sms(text: str) -> bool:
    """Classify if SMS indicates a subscription payment."""
    text_lower = text.lower()
    for pattern in STRONG_SUBSCRIPTION_SIGNALS:
        if re.search(pattern, text_lower):
            return True
    has_billing = any(re.search(p, text_lower) for p in WEAK_BILLING_SIGNALS)
    return False  # Weak signals alone aren't enough


def extract_sender_bank(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract SMS sender ID and resolve bank name."""
    match = re.match(r'^([A-Z]{2}-[A-Z]+):\s', text)
    if match:
        sender = match.group(1)
        bank = BANK_SENDER_PREFIXES.get(sender)
        return sender, bank
    return None, None


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

    Returns list of dicts with keys: date, amount, description, merchant,
    is_subscription, sender, bank, raw_text.
    Returns empty list if no transaction is found.
    """
    if not text or not text.strip():
        return []

    # Smart filtering - skip non-transaction SMS
    if should_skip_sms(text):
        return []

    # Extract sender/bank info (before stripping prefix from text)
    sender, bank = extract_sender_bank(text)

    # Strip sender prefix from text for amount/date extraction
    amount_text = text
    if sender:
        amount_text = re.sub(r'^[A-Z]{2}-[A-Z]+:\s', '', text)

    # Amount extraction
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

    amount_match = amount_pattern.search(amount_text)
    if not amount_match:
        return []

    amount_str = amount_match.group(0)
    amount = extract_amount(amount_str)
    if amount is None or amount <= 0:
        return []

    resolved_date = None

    date_match = date_pattern.search(amount_text)
    if date_match:
        resolved_date = parse_absolute_date(date_match.group(0))

    if resolved_date is None:
        rel_match = relative_date_pattern.search(amount_text)
        if rel_match:
            resolved_date = parse_relative_date(rel_match.group(0))

    if resolved_date is None:
        resolved_date = date.today()

    description = extract_description(amount_text, amount_str, date_match.group(0) if date_match else None)

    # Extract merchant
    merchant = extract_merchant(amount_text)
    if merchant is None:
        merchant = description  # fallback to cleaned description

    # Classify subscription
    is_sub = is_subscription_sms(amount_text)

    return [{
        'date': resolved_date.isoformat(),
        'amount': round(amount, 2),
        'description': description,
        'merchant': merchant,
        'is_subscription': is_sub,
        'sender': sender,
        'bank': bank,
        'raw_text': text,
    }]


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
