from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from app.intelligence.recurring_detector import RecurringDetector, RecurringPattern
from app.intelligence.subscription_detector import SubscriptionDetector, Subscription
from app.intelligence.leak_scorer import LeakScorer
from app.intelligence.recommendation_engine import RecommendationEngine, Recommendation


@dataclass
class IntelligenceResult:
    recurring_patterns: List[RecurringPattern]
    subscriptions: List[Subscription]
    recommendations: List[Recommendation]
    subscription_count: int
    total_monthly_leak: float
    leak_score: int


class IntelligenceEngine:
    """Orchestrates all intelligence stages."""

    def __init__(self):
        self.recurring_detector = RecurringDetector()
        self.subscription_detector = SubscriptionDetector()
        self.leak_scorer = LeakScorer()
        self.recommendation_engine = RecommendationEngine()

    def analyze(self, transactions: List[Transaction]) -> IntelligenceResult:
        patterns = self.recurring_detector.detect(transactions)
        subscriptions = self.subscription_detector.detect(transactions, patterns)

        recommendations = []
        total_monthly = 0.0

        for sub in subscriptions:
            leak_score = self.leak_scorer.calculate(sub)
            recommendation = self.recommendation_engine.recommend(sub, leak_score)
            recommendations.append(recommendation)

            if sub.is_subscription:
                total_monthly += sub.amount

        if subscriptions:
            leak_scores = [self.leak_scorer.calculate(s) for s in subscriptions]
            overall_leak_score = int(sum(leak_scores) / len(leak_scores))
        else:
            overall_leak_score = 0

        return IntelligenceResult(
            recurring_patterns=patterns,
            subscriptions=subscriptions,
            recommendations=recommendations,
            subscription_count=sum(1 for s in subscriptions if s.is_subscription),
            total_monthly_leak=round(total_monthly, 2),
            leak_score=overall_leak_score,
        )
