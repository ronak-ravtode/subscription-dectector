import re
from html import unescape
from typing import List, Dict

# Strong billing keywords - email must contain at least one of these to be a subscription
BILLING_KEYWORDS = [
    'receipt', 'payment', 'charged', 'billed', 'invoice',
    'transaction', 'purchase', 'order confirmation',
    'payment confirmation', 'your receipt from',
    'renewal charge', 'subscription charge',
]

# Subscription-specific keywords that appear in billing context
SUBSCRIPTION_KEYWORDS = [
    'subscription', 'renewal', 'billing', 'membership',
    'auto-renew', 'monthly plan', 'annual plan', 'yearly plan',
]

# Strong standalone signals that confirm subscription (no billing keyword needed)
STRONG_SUBSCRIPTION_SIGNALS = [
    'auto-renew', 'subscription renewal', 'membership renewal',
    'next billing date', 'recurring charge', 'subscription charge',
]


def strip_html_tags(html: str) -> str:
    """Remove HTML tags, return plain text."""
    clean = re.sub(r'<[^>]+>', ' ', html)
    return unescape(clean).strip()


def _normalize_whitespace(text: str) -> str:
    """Collapse runs of whitespace into single spaces."""
    return re.sub(r'\s+', ' ', text).strip()


def _extract_amount(text: str) -> tuple[float, str] | None:
    """Extract monetary amount from text. Returns (float_value, original_string) or None."""
    # Match currency symbols followed by digits (e.g., $12.99, ₹500, €9.99)
    patterns = [
        r'[\$₹€£]\s*([\d,]+\.?\d*)',           # $12.99, ₹500, €9.99
        r'([\d,]+\.?\d*)\s*(?:USD|INR|EUR|GBP)', # 12.99 USD
        r'(?:amount|total|charge|price)[:\s]*[\$₹€£]?\s*([\d,]+\.?\d*)', # amount: $12.99
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                amount = float(amount_str)
                if amount > 0:
                    return (amount, amount_str)
            except ValueError:
                continue
    
    return None


def _extract_date(text: str) -> str | None:
    """Extract date from text. Returns None if no date found."""
    date_patterns = [
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',      # MM/DD/YYYY, DD-MM-YYYY
        r'(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',          # YYYY-MM-DD
        r'(\w+ \d{1,2},?\s*\d{4})',                    # January 15, 2026
        r'(\d{1,2}\s+\w+\s+\d{4})',                    # 15 January 2026
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip()
    
    return None


def _extract_merchant_from_subject(subject: str) -> str | None:
    """Try to extract merchant name from email subject line."""
    if not subject:
        return None
    
    # Common subject patterns for subscription emails
    patterns = [
        r'(?:receipt|invoice|order confirmation|payment) (?:from|for|:)\s*(.+?)(?:\s*[-–]|$)',
        r'(.+?)\s*[-–]\s*(?:receipt|invoice|order|payment|subscription|billing)',
        r'(?:your|a)\s+(.+?)\s+(?:receipt|invoice|subscription|membership)',
        r'(.+?)\s+(?:monthly|annual|premium|pro|plan)\s+(?:plan|subscription|membership)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, subject, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            # Filter out non-merchant strings
            skip_words = {'your', 'a', 'the', 're', 'fwd', 'fw', 'from', 'for', 'no', 'order'}
            if merchant.lower().split()[0] not in skip_words and len(merchant) > 1:
                return merchant
    
    return None


def _extract_merchant_from_body(text: str, subject: str = None) -> str | None:
    """Extract merchant/service name from email body using common patterns."""
    # Common patterns in subscription emails
    patterns = [
        r'(?:from|merchant|vendor|seller|store)[:\s]+([A-Z][A-Za-z0-9\s&\.]{2,40})',
        r'(?:billed by|charged by|paid to|payment to)[:\s]+([A-Z][A-Za-z0-9\s&\.]{2,40})',
        r'(?:merchant name|merchant)[:\s]+([A-Z][A-Za-z0-9\s&\.]{2,40})',
        r'(?:service|product)[:\s]+([A-Z][A-Za-z0-9\s&\.]{2,40})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            if len(merchant) > 2:
                return merchant
    
    # Try to extract from common email footer patterns
    footer_patterns = [
        r'(?:copyright|©)\s+\d{4}\s+([A-Z][A-Za-z\s&\.]+?)(?:\.|,|\s+all)',
        r'(?:terms|privacy|support)\s+(?:of|at)\s+(.+?)(?:\s|$)',
    ]
    
    for pattern in footer_patterns:
        match = re.search(pattern, text)
        if match:
            merchant = match.group(1).strip()
            if len(merchant) > 2:
                return merchant
    
    return None


def is_subscription_email(subject: str, body: str) -> bool:
    """
    Check if an email is an actual subscription billing email.
    Only returns True for emails that contain billing/payment context
    or strong subscription signals, not notifications or promos.
    """
    text = f"{subject or ''} {body or ''}".lower()

    # Strong signals alone are enough (e.g., "auto-renew", "next billing date")
    if any(signal in text for signal in STRONG_SUBSCRIPTION_SIGNALS):
        return True

    # Otherwise need both billing context + subscription keyword
    has_billing = any(kw in text for kw in BILLING_KEYWORDS)
    has_subscription = any(kw in text for kw in SUBSCRIPTION_KEYWORDS)

    return has_billing and has_subscription


def extract_transactions_from_email(
    subject: str = None,
    from_email: str = None,
    email_content: str = None
) -> List[Dict]:
    """
    Parse email body and extract subscription/transaction information.
    
    Returns a list of dicts with keys: date, amount, merchant, is_subscription
    """
    if not email_content:
        return []
    
    # Strip HTML if present
    if '<' in email_content:
        text = strip_html_tags(email_content)
    else:
        text = email_content
    
    text = _normalize_whitespace(text)
    
    results = []
    
    # Try to extract structured transaction data
    amount_result = _extract_amount(text)
    amount = amount_result[0] if amount_result else None
    amount_str = amount_result[1] if amount_result else None
    date = _extract_date(text)
    
    # Try to extract merchant from different sources
    merchant = None
    
    # 1. Try subject line
    if subject:
        merchant = _extract_merchant_from_subject(subject)
    
    # 2. Try body patterns
    if not merchant:
        merchant = _extract_merchant_from_body(text, subject)
    
    # 3. Fall back to sender domain
    if not merchant and from_email:
        domain = from_email.split('@')[-1] if '@' in from_email else None
        if domain:
            # Clean up domain to get merchant name
            merchant = domain.split('.')[0].title()
    
    # Check if this is a subscription email
    is_subscription = is_subscription_email(subject, text)
    
    # If we found any meaningful data, return it
    if amount or merchant or is_subscription:
        results.append({
            'date': date,
            'amount': amount_str if amount_str else None,
            'merchant': merchant,
            'description': merchant,
            'is_subscription': is_subscription,
        })
    
    # Also try to extract multiple transactions if present (e.g., receipts with multiple items)
    # Look for lines with amounts
    line_amount_pattern = re.compile(
        r'([\$₹€£]\s*[\d,]+\.?\d*|\d+[\.,]\d{2}\s*(?:USD|INR|EUR|GBP))',
        re.IGNORECASE
    )
    
    seen_amount_values = set()
    if amount:
        seen_amount_values.add(amount)
    
    for amount_match in line_amount_pattern.finditer(text):
        raw_amount_str = amount_match.group(1)
        try:
            clean_amount = re.sub(r'[^\d.,]', '', raw_amount_str).replace(',', '')
            parsed_amount = float(clean_amount)
            if parsed_amount > 0 and parsed_amount not in seen_amount_values:
                seen_amount_values.add(parsed_amount)
                # Found an additional amount, add as separate transaction
                # Try to find nearby description
                context_start = max(0, amount_match.start() - 100)
                context_end = min(len(text), amount_match.end() + 100)
                context = text[context_start:context_end]
                
                # Look for description near this amount
                desc_match = re.search(
                    r'([A-Z][A-Za-z0-9\s]{3,40})(?:\s*[-–:]?\s*[\$₹€£]|\s*$)',
                    context
                )
                desc = desc_match.group(1).strip() if desc_match else merchant
                
                results.append({
                    'date': date,
                    'amount': clean_amount,
                    'merchant': desc or merchant,
                    'description': desc or merchant,
                    'is_subscription': is_subscription,
                })
        except ValueError:
            continue
    
    # Deduplicate results by amount
    seen_amounts = set()
    unique_results = []
    for r in results:
        key = r.get('amount')
        if key not in seen_amounts:
            seen_amounts.add(key)
            unique_results.append(r)
    
    return unique_results if unique_results else []
