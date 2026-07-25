import pytest
import os
from unittest.mock import patch, MagicMock
from app.models import Subscription, Frequency, PriceTrend, Action
from app.recommenders.action_recommender import (
    build_recommendation_prompt, parse_recommendation, get_gemini_recommendation
)


def make_sub(**kwargs) -> Subscription:
    defaults = {
        "id": "test",
        "merchant": "NETFLIX",
        "amount": 15.99,
        "frequency": Frequency.MONTHLY,
        "category": "entertainment",
        "leak_score": 45,
        "action": Action.REVIEW,
        "reasoning": "",
        "price_trend": PriceTrend.STABLE,
        "duration_months": 12,
        "price_increases": 0,
    }
    defaults.update(kwargs)
    return Subscription(**defaults)


def test_build_recommendation_prompt():
    sub = make_sub()
    prompt = build_recommendation_prompt(sub)
    assert "NETFLIX" in prompt
    assert "15.99" in prompt
    assert "45/100" in prompt


def test_parse_recommendation_valid_json():
    response = '{"action": "cancel", "reasoning": "Too expensive for usage"}'
    result = parse_recommendation(response)
    assert result["action"] == Action.CANCEL
    assert "Too expensive" in result["reasoning"]


def test_parse_recommendation_with_markdown():
    response = '```json\n{"action": "keep", "reasoning": "Good value"}\n```'
    result = parse_recommendation(response)
    assert result["action"] == Action.KEEP


def test_parse_recommendation_invalid():
    response = "not valid json"
    result = parse_recommendation(response)
    assert result["action"] == Action.REVIEW


def test_get_gemini_recommendation_no_api_key():
    sub = make_sub()
    with patch.dict(os.environ, {"GEMINI_API_KEY": "your_api_key_here"}):
        result = get_gemini_recommendation(sub)
        assert "action" in result
        assert "reasoning" in result
