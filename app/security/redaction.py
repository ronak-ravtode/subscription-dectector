import re
from typing import Dict, Pattern, Optional


class Redactor:
    """Redacts PII from text."""

    def __init__(self):
        self.patterns: Dict[str, Pattern] = {
            'account_number': re.compile(r'\b\d{9,18}\b'),
            'ifsc_code': re.compile(r'\b[A-Z]{4}0[A-Z0-9]{6}\b'),
            'upi_id': re.compile(r'\b[\w.-]+@[\w]+\b'),
            'phone_number': re.compile(r'\b\d{10}\b'),
            'email': re.compile(r'\b[\w.-]+@[\w.-]+\.\w+\b'),
        }

    def redact(self, text: str, pii_types: Optional[list] = None) -> str:
        """Redact PII from text."""
        if pii_types is None:
            pii_types = list(self.patterns.keys())

        for pii_type in pii_types:
            if pii_type in self.patterns:
                text = self.patterns[pii_type].sub('***', text)

        return text

    def redact_dict(self, data: dict, pii_types: Optional[list] = None) -> dict:
        """Redact PII from dictionary values."""
        redacted = {}
        for key, value in data.items():
            if isinstance(value, str):
                redacted[key] = self.redact(value, pii_types)
            else:
                redacted[key] = value
        return redacted
