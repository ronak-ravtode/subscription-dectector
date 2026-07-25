import pytest
from app.models import Subscription, Frequency, PriceTrend, Action
from app.scoring.leak_scorer import (
    calculate_leak_score, score_price_increase, score_duration,
    score_frequency, score_category, score_to_action
)


def make_sub(**kwargs) -> Subscription:
    defaults = {
        "id": "test",
        "merchant": "TEST",
        "amount": 15.99,
        "frequency": Frequency.MONTHLY,
        "category": "entertainment",
        "leak_score": 0,
        "action": Action.REVIEW,
        "reasoning": "",
        "price_trend": PriceTrend.STABLE,
        "duration_months": 6,
        "price_increases": 0,
    }
    defaults.update(kwargs)
    return Subscription(**defaults)


def test_score_price_increase_stable():
    sub = make_sub(price_trend=PriceTrend.STABLE)
    assert score_price_increase(sub) == 0


def test_score_price_increase_increased():
    sub = make_sub(price_trend=PriceTrend.INCREASED, price_increases=2)
    assert score_price_increase(sub) == 30


def test_score_price_increase_max():
    sub = make_sub(price_trend=PriceTrend.INCREASED, price_increases=5)
    assert score_price_increase(sub) == 40


def test_score_duration_short():
    sub = make_sub(duration_months=3)
    assert score_duration(sub) == 0


def test_score_duration_long():
    sub = make_sub(duration_months=24)
    assert score_duration(sub) == 20


def test_score_frequency_monthly():
    sub = make_sub(frequency=Frequency.MONTHLY)
    assert score_frequency(sub) == 15


def test_score_frequency_weekly():
    sub = make_sub(frequency=Frequency.WEEKLY)
    assert score_frequency(sub) == 20


def test_score_frequency_annual():
    sub = make_sub(frequency=Frequency.ANNUAL)
    assert score_frequency(sub) == 5


def test_score_category_entertainment():
    sub = make_sub(category="entertainment")
    assert score_category(sub) == 15


def test_score_category_utilities():
    sub = make_sub(category="utilities")
    assert score_category(sub) == 5


def test_calculate_leak_score_low():
    sub = make_sub(
        price_trend=PriceTrend.STABLE,
        duration_months=3,
        frequency=Frequency.ANNUAL,
        category="utilities",
    )
    score = calculate_leak_score(sub)
    assert score <= 30


def test_calculate_leak_score_high():
    sub = make_sub(
        price_trend=PriceTrend.INCREASED,
        price_increases=3,
        duration_months=24,
        frequency=Frequency.MONTHLY,
        category="entertainment",
    )
    score = calculate_leak_score(sub)
    assert score >= 70


def test_score_to_action_low():
    assert score_to_action(20) == "keep"


def test_score_to_action_medium():
    assert score_to_action(45) == "review"


def test_score_to_action_high():
    assert score_to_action(75) == "downgrade"


def test_score_to_action_critical():
    assert score_to_action(90) == "cancel"
