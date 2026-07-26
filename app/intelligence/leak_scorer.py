from app.intelligence.subscription_detector import Subscription
from datetime import date


class LeakScorer:
    """Calculates leak score for subscriptions."""

    def calculate(self, subscription: Subscription) -> int:
        """Calculate leak score (0-100)."""
        score = 0

        # Amount factor (higher = more leak)
        score += min(subscription.amount / 10, 30)

        # Duration factor (longer = more leak)
        days_active = (subscription.last_seen - subscription.first_seen).days
        if days_active > 180:
            score += 15
        elif days_active > 90:
            score += 10
        elif days_active > 30:
            score += 5

        # Frequency factor
        if subscription.frequency == 'monthly':
            score += 10
        elif subscription.frequency == 'weekly':
            score += 15

        # Transaction count factor
        if subscription.transaction_count >= 6:
            score += 10
        elif subscription.transaction_count >= 3:
            score += 5

        return min(int(score), 100)
