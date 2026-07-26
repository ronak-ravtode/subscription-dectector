import json
import os
from dataclasses import dataclass

RULES_PATH = os.path.join(os.path.dirname(__file__), 'category_rules.json')

@dataclass
class CategoryResult:
    category: str
    subcategory: str
    confidence: float

class TransactionCategorizer:
    """Categorizes transactions based on description and merchant."""

    def __init__(self):
        self.rules = self._load_rules()

    def _load_rules(self) -> dict:
        if os.path.exists(RULES_PATH):
            with open(RULES_PATH, 'r') as f:
                return json.load(f)
        return {"categories": {}}

    def categorize(self, description: str, merchant_name: str = None) -> CategoryResult:
        search_text = (merchant_name or description).lower()

        for category, config in self.rules.get('categories', {}).items():
            for keyword in config.get('keywords', []):
                if keyword.lower() in search_text:
                    subcategory = self._find_subcategory(search_text, config.get('subcategories', {}))
                    return CategoryResult(
                        category=category,
                        subcategory=subcategory,
                        confidence=0.9,
                    )

        return CategoryResult(
            category='other',
            subcategory='',
            confidence=0.5,
        )

    def _find_subcategory(self, text: str, subcategories: dict) -> str:
        for subcategory, keywords in subcategories.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return subcategory
        return ''
