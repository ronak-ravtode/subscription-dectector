from app.models import Subscription, Frequency, PriceTrend


def score_price_increase(subscription: Subscription) -> int:
    """Score based on price changes (0-40 points)."""
    if subscription.price_trend == PriceTrend.INCREASED:
        return min(40, subscription.price_increases * 15)
    return 0


def score_duration(subscription: Subscription) -> int:
    """Score based on how long subscribed (0-25 points)."""
    return min(25, subscription.duration_months // 6 * 5)


def score_frequency(subscription: Subscription) -> int:
    """Score based on payment frequency (0-20 points)."""
    frequency_scores = {
        Frequency.WEEKLY: 20,
        Frequency.MONTHLY: 15,
        Frequency.QUARTERLY: 10,
        Frequency.ANNUAL: 5,
    }
    return frequency_scores.get(subscription.frequency, 0)


def score_category(subscription: Subscription) -> int:
    """Score based on subscription category (0-15 points)."""
    category_scores = {
        'entertainment': 15,
        'software': 12,
        'streaming': 15,
        'gaming': 12,
        'utilities': 5,
        'insurance': 3,
        'other': 8,
    }
    return category_scores.get(subscription.category, 8)


def calculate_leak_score(subscription: Subscription) -> int:
    """Calculate 0-100 leak score based on rules."""
    score = 0
    score += score_price_increase(subscription)
    score += score_duration(subscription)
    score += score_frequency(subscription)
    score += score_category(subscription)
    return min(100, score)


def score_to_action(score: int) -> str:
    """Map score to recommended action."""
    if score <= 30:
        return "keep"
    elif score <= 60:
        return "review"
    elif score <= 80:
        return "downgrade"
    else:
        return "cancel"
