import json
import os
import re
from typing import List, Optional
from app.models import Transaction
import uuid
from datetime import datetime

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
                try:
                    parsed_date = datetime.strptime(date_match.group(0), '%d/%m/%Y').date()
                except ValueError:
                    continue

                # Extract description - skip past all date occurrences in the prefix
                date_pattern_all = r'\d{2}/\d{2}/\d{4}'
                all_dates = list(re.finditer(date_pattern_all, line))
                if len(all_dates) > 1:
                    raw_desc = line[all_dates[-1].end():]
                else:
                    raw_desc = line[date_match.end():]

                # Strip trailing amount/balance from description
                raw_desc = re.sub(r'(?:Sent|Refun|Pay|Manda|UPIInt|UPI)?\s*\d+\.?\d*\s+\d+\.?\d*\s*$', '', raw_desc).strip()
                cleaned_desc = clean_description(raw_desc, template)
                txn_type = detect_transaction_type(line)

                transactions.append(Transaction(
                    id=str(uuid.uuid4()),
                    date=parsed_date,
                    amount=abs(amount),
                    description=cleaned_desc,
                    raw_description=raw_desc.strip(),
                    merchant_normalized=cleaned_desc,
                    transaction_type=txn_type,
                    balance=balance,
                    confidence_score=0.92,
                    extraction_method='template',
                    bank_name=template.get('bank_name', ''),
                ))

    return transactions
