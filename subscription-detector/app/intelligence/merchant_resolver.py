import json
import os
from dataclasses import dataclass
from typing import Optional
from difflib import SequenceMatcher

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'merchant_database.json')

@dataclass
class MerchantResult:
    canonical_name: str
    category: str
    subcategory: str
    confidence: float
    original_description: str

class MerchantResolver:
    """Resolves merchant names to canonical form."""
    
    def __init__(self):
        self.database = self._load_database()
    
    def _load_database(self) -> dict:
        """Load merchant database from JSON file."""
        if os.path.exists(DATABASE_PATH):
            with open(DATABASE_PATH, 'r') as f:
                return json.load(f)
        return {"merchants": {}}
    
    def resolve(self, description: str) -> MerchantResult:
        """Resolve a transaction description to a canonical merchant."""
        desc_upper = description.upper().strip()
        
        # Exact match on canonical name
        for key, merchant in self.database.get('merchants', {}).items():
            if merchant['canonical_name'].upper() == desc_upper:
                return MerchantResult(
                    canonical_name=merchant['canonical_name'],
                    category=merchant['category'],
                    subcategory=merchant['subcategory'],
                    confidence=1.0,
                    original_description=description,
                )
        
        # Match on aliases
        for key, merchant in self.database.get('merchants', {}).items():
            for alias in merchant.get('aliases', []):
                if alias.upper() == desc_upper:
                    return MerchantResult(
                        canonical_name=merchant['canonical_name'],
                        category=merchant['category'],
                        subcategory=merchant['subcategory'],
                        confidence=0.95,
                        original_description=description,
                    )
        
        # Fuzzy match
        best_match = None
        best_score = 0.0
        
        for key, merchant in self.database.get('merchants', {}).items():
            # Check canonical name similarity
            score = SequenceMatcher(None, desc_upper, merchant['canonical_name'].upper()).ratio()
            if score > best_score and score > 0.6:
                best_score = score
                best_match = merchant
            
            # Check alias similarity
            for alias in merchant.get('aliases', []):
                score = SequenceMatcher(None, desc_upper, alias.upper()).ratio()
                if score > best_score and score > 0.6:
                    best_score = score
                    best_match = merchant
        
        if best_match:
            return MerchantResult(
                canonical_name=best_match['canonical_name'],
                category=best_match['category'],
                subcategory=best_match['subcategory'],
                confidence=best_score * 0.9,  # Penalize fuzzy match
                original_description=description,
            )
        
        # No match - return original
        return MerchantResult(
            canonical_name=description.title(),
            category='other',
            subcategory='',
            confidence=0.5,
            original_description=description,
        )
