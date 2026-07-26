from dataclasses import dataclass
from typing import List
from app.models import Transaction
from app.intelligence.recurring_detector import RecurringPattern

KNOWN_SUBSCRIPTION_MERCHANTS = [
    'Netflix', 'Spotify', 'Disney+', 'YouTube Premium', 'Amazon Prime',
    'Adobe', 'Microsoft', 'GitHub', 'Figma', 'Canva', 'Slack', 'Zoom',
    'iCloud', 'Google One', 'Dropbox', 'Notion', 'Medium',
]


@dataclass
class Subscription:
    merchant: str
    amount: float
    frequency: str
    category: str
    is_subscription: bool
    confidence: float
    transaction_count: int
    first_seen: object
    last_seen: object
    transaction_ids: List[str]


class SubscriptionDetector:
    """Detects subscriptions from recurring patterns."""

    def detect(self, transactions: List[Transaction], patterns: List[RecurringPattern]) -> List[Subscription]:
        """Detect subscriptions from recurring patterns."""
        subscriptions = []

        for pattern in patterns:
            is_subscription = self._is_subscription(pattern)
            confidence = self._calculate_confidence(pattern, is_subscription)

            subscriptions.append(Subscription(
                merchant=pattern.merchant,
                amount=pattern.avg_amount,
                frequency=pattern.frequency,
                category='subscription' if is_subscription else 'recurring',
                is_subscription=is_subscription,
                confidence=confidence,
                transaction_count=pattern.transaction_count,
                first_seen=pattern.first_seen,
                last_seen=pattern.last_seen,
                transaction_ids=pattern.transaction_ids,
            ))

        return subscriptions

    def _is_subscription(self, pattern: RecurringPattern) -> bool:
        """Determine if a recurring pattern is a subscription."""
        if pattern.merchant in KNOWN_SUBSCRIPTION_MERCHANTS:
            return True

        common_prices = [4.99, 5.99, 7.99, 9.99, 12.99, 14.99, 15.99, 19.99, 29.99, 49.99, 99.99]
        if any(abs(pattern.avg_amount - price) < 0.01 for price in common_prices):
            return True

        if pattern.frequency == 'monthly' and pattern.consistency_score > 0.8:
            return True

        return False

    def _calculate_confidence(self, pattern: RecurringPattern, is_subscription: bool) -> float:
        """Calculate confidence score for subscription detection."""
        confidence = 0.5

        if is_subscription:
            confidence += 0.3

        confidence += pattern.consistency_score * 0.2

        return min(confidence, 1.0)
