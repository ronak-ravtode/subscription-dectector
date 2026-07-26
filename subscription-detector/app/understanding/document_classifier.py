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
