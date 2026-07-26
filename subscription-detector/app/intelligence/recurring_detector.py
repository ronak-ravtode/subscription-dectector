from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from datetime import date
from collections import defaultdict


@dataclass
class RecurringPattern:
    merchant: str
    frequency: str  # 'weekly' | 'monthly' | 'quarterly' | 'annual'
    avg_amount: float
    interval_days: int
    consistency_score: float
    transaction_count: int
    first_seen: date
    last_seen: date
    transaction_ids: List[str] = field(default_factory=list)


from app.extractors.transaction_extractor import is_person_transfer


class RecurringDetector:
    """Detects recurring payment patterns."""

    def detect(self, transactions: List[Transaction]) -> List[RecurringPattern]:
        """Detect recurring patterns in transactions."""
        # Group by merchant
        merchant_groups = defaultdict(list)
        for txn in transactions:
            merchant = (txn.merchant_normalized or txn.description).strip()
            if not merchant or merchant.upper() == "UNKNOWN":
                continue
            if is_person_transfer(merchant):
                continue
            merchant_groups[merchant].append(txn)

        patterns = []

        for merchant, txns in merchant_groups.items():
            if len(txns) < 2:
                continue

            amounts = [t.amount for t in txns]
            avg_amt = sum(amounts) / len(amounts)

            # Skip micro-amounts (< 1.0) such as $0 / ₹0 test transactions
            if avg_amt < 1.0:
                continue

            # Sort by date
            txns.sort(key=lambda t: t.date)

            # Calculate intervals
            intervals = []
            for i in range(1, len(txns)):
                delta = (txns[i].date - txns[i - 1].date).days
                intervals.append(delta)

            if not intervals:
                continue

            # Determine frequency
            avg_interval = sum(intervals) / len(intervals)
            frequency = self._classify_frequency(avg_interval)

            if not frequency or frequency == 'irregular':
                continue

            # Calculate consistency
            consistency = self._calculate_consistency(intervals)
            amount_consistency = self._calculate_amount_consistency(amounts)
            overall_consistency = (consistency + amount_consistency) / 2

            if overall_consistency > 0.6:
                patterns.append(RecurringPattern(
                    merchant=merchant.title(),
                    frequency=frequency,
                    avg_amount=round(avg_amt, 2),
                    interval_days=int(avg_interval),
                    consistency_score=overall_consistency,
                    transaction_count=len(txns),
                    first_seen=txns[0].date,
                    last_seen=txns[-1].date,
                    transaction_ids=[t.id for t in txns],
                ))

        return patterns

    def _classify_frequency(self, avg_interval: float) -> str:
        if avg_interval < 4.0:
            return 'irregular'
        elif avg_interval <= 12.0:
            return 'weekly'
        elif avg_interval <= 35.0:
            return 'monthly'
        elif avg_interval <= 100.0:
            return 'quarterly'
        else:
            return 'annual'

    def _calculate_consistency(self, intervals: List[int]) -> float:
        if len(intervals) < 2:
            return 1.0

        avg = sum(intervals) / len(intervals)
        variance = sum((x - avg) ** 2 for x in intervals) / len(intervals)
        std_dev = variance ** 0.5

        # Lower std dev = higher consistency
        if avg == 0:
            return 0.0
        cv = std_dev / avg  # Coefficient of variation

        return max(0, 1 - cv)

    def _calculate_amount_consistency(self, amounts: List[float]) -> float:
        if len(amounts) < 2:
            return 1.0

        avg = sum(amounts) / len(amounts)
        if avg == 0:
            return 0.0

        variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
        cv = (variance ** 0.5) / avg

        return max(0, 1 - cv)
