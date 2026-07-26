from dataclasses import dataclass
from app.intelligence.subscription_detector import Subscription


@dataclass
class Recommendation:
    action: str  # 'keep' | 'review' | 'cancel'
    reasoning: str
    confidence: float


class RecommendationEngine:
    """Generates recommendations for subscriptions."""

    def recommend(self, subscription: Subscription, leak_score: int) -> Recommendation:
        """Generate recommendation for a subscription."""

        if leak_score >= 70:
            return Recommendation(
                action='cancel',
                reasoning=f'High leak score ({leak_score}). Consider cancelling to save Rs.{subscription.amount * 12:.0f}/year.',
                confidence=0.8,
            )

        if leak_score >= 40:
            return Recommendation(
                action='review',
                reasoning=f'Moderate leak score ({leak_score}). Review if still needed.',
                confidence=0.7,
            )

        return Recommendation(
            action='keep',
            reasoning=f'Low leak score ({leak_score}). Good value subscription.',
            confidence=0.9,
        )
