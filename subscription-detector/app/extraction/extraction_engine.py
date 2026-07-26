from dataclasses import dataclass, field
from typing import List, Optional
from app.models import Transaction
from app.extraction.tier1_rules import extract_with_rules
from app.extraction.tier2_templates import extract_with_template, load_template
from app.extraction.tier3_ai import AIExtractor


@dataclass
class ExtractionResult:
    transactions: List[Transaction]
    tier_used: str  # 'rules' | 'template' | 'ai' | 'human' | 'none'
    confidence: float
    warnings: List[str] = field(default_factory=list)


class ExtractionEngine:
    """Orchestrates tiered extraction."""

    def extract(self, text: str, bank_code: str = 'unknown', pdf_path: Optional[str] = None) -> ExtractionResult:
        """Extract transactions using the best available tier."""
        warnings = []

        # Tier 2: Try template first if bank is known
        if bank_code != 'unknown' and load_template(bank_code):
            transactions = extract_with_template(text, bank_code)
            if transactions:
                avg_confidence = sum(t.confidence_score for t in transactions) / len(transactions)
                return ExtractionResult(
                    transactions=transactions,
                    tier_used='template',
                    confidence=avg_confidence,
                    warnings=warnings,
                )

        # Tier 1: Try rule-based extraction
        transactions = extract_with_rules(text)
        if transactions:
            avg_confidence = sum(t.confidence_score for t in transactions) / len(transactions)
            return ExtractionResult(
                transactions=transactions,
                tier_used='rules',
                confidence=avg_confidence,
                warnings=warnings,
            )

        # Tier 3: Try AI extraction if PDF path provided and Tier 1/Tier 2 failed
        if pdf_path:
            try:
                ai_extractor = AIExtractor()
                ai_result = ai_extractor.extract(pdf_path, bank_code)
                if ai_result.transactions:
                    avg_confidence = sum(t.confidence_score for t in ai_result.transactions) / len(ai_result.transactions)
                    warnings.extend(ai_result.warnings)
                    return ExtractionResult(
                        transactions=ai_result.transactions,
                        tier_used='ai',
                        confidence=avg_confidence,
                        warnings=warnings,
                    )
            except Exception as e:
                warnings.append(f"AI extraction failed: {str(e)}")

        # No transactions found
        warnings.append("No transactions detected. The PDF may be scanned or in an unusual format.")
        return ExtractionResult(
            transactions=[],
            tier_used='none',
            confidence=0.0,
            warnings=warnings,
        )
