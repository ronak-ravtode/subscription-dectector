import os
import json
from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
import uuid

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


@dataclass
class AIExtractionResult:
    transactions: List[Transaction]
    confidence: float
    raw_response: str
    warnings: List[str] = field(default_factory=list)


class AIExtractor:
    """Extracts transactions using Google Gemini Flash."""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-1.5-flash"

    def extract(self, pdf_path: str, bank_code: str = "unknown") -> AIExtractionResult:
        """Extract transactions from PDF using Gemini."""
        warnings = []

        if not GEMINI_AVAILABLE:
            warnings.append("google-generativeai not installed")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )

        if not self.api_key or self.api_key == "your_api_key_here":
            warnings.append("GEMINI_API_KEY not configured")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )

        try:
            import fitz

            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name)

            doc = fitz.open(pdf_path)

            all_transactions = []
            response_text = ""

            for page_num in range(min(len(doc), 10)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")

                prompt = self._build_prompt(bank_code)

                response = model.generate_content(
                    [prompt, {"mime_type": "image/png", "data": img_data}]
                )

                if response.text:
                    response_text = response.text
                    transactions = self._parse_response(response.text)
                    all_transactions.extend(transactions)

            doc.close()

            return AIExtractionResult(
                transactions=all_transactions,
                confidence=0.75,
                raw_response=response_text,
                warnings=warnings,
            )

        except Exception as e:
            warnings.append(f"AI extraction failed: {str(e)}")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )

    def _build_prompt(self, bank_code: str) -> str:
        """Build extraction prompt for Gemini."""
        return """Extract all transactions from this bank statement page.

For each transaction, return:
- date: in YYYY-MM-DD format
- description: the transaction description/narration
- amount: the numeric amount (positive for credits, negative for debits)
- balance: the running balance if available
- type: "credit" or "debit"

Return ONLY a JSON array with no other text. Example:
[
  {"date": "2026-01-15", "description": "NETFLIX.COM", "amount": -15.99, "balance": 1500.00, "type": "debit"},
  {"date": "2026-01-20", "description": "SALARY", "amount": 5000.00, "balance": 6500.00, "type": "credit"}
]

If no transactions are found, return an empty array: []"""

    def _parse_response(self, response_text: str) -> List[Transaction]:
        """Parse Gemini response into transactions."""
        transactions = []

        try:
            text = response_text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()

            data = json.loads(text)

            if not isinstance(data, list):
                return transactions

            for item in data:
                try:
                    from datetime import datetime

                    date_str = item.get('date', '')
                    if date_str:
                        date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    else:
                        continue

                    amount = float(item.get('amount', 0))
                    if amount == 0:
                        continue

                    description = item.get('description', '').strip()
                    if not description:
                        continue

                    balance = float(item.get('balance', 0))
                    txn_type = item.get('type', 'debit' if amount < 0 else 'credit')

                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=date,
                        amount=abs(amount),
                        description=description,
                        raw_description=description,
                        merchant_normalized=description.upper(),
                        transaction_type=txn_type,
                        balance=balance,
                        confidence_score=0.75,
                        extraction_method='ai',
                    ))

                except (ValueError, KeyError):
                    continue

        except json.JSONDecodeError:
            pass

        return transactions
