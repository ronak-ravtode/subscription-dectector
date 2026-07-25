import re
from html import unescape
from typing import List

def strip_html_tags(html: str) -> str:
    """Remove HTML tags, return plain text."""
    clean = re.sub(r'<[^>]+>', ' ', html)
    return unescape(clean).strip()

def extract_transactions_from_email(email_content: str) -> List[dict]:
    """Parse bank statement email body into transactions."""
    if '<' in email_content:
        text = strip_html_tags(email_content)
    else:
        text = email_content
    
    transactions = []
    
    line_pattern = re.compile(
        r'(?P<date>\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|\d{4}[/\-]\d{1,2}[/\-]\d{1,2})'
        r'.*?'
        r'(?P<amount>[\$₹€£]?\s*[\d,]+\.?\d*)'
        r'.*?'
        r'(?P<description>[A-Za-z0-9\s\.\-]{3,})',
        re.MULTILINE
    )
    
    for match in line_pattern.finditer(text):
        transactions.append({
            "date": match.group("date"),
            "amount": match.group("amount"),
            "description": match.group("description").strip(),
        })
    
    return transactions
