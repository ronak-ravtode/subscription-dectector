import os
import json
import google.generativeai as genai
from typing import List
from dotenv import load_dotenv
from app.models import Subscription, Action
from app.scoring.leak_scorer import score_to_action

load_dotenv()


def build_recommendation_prompt(subscription: Subscription) -> str:
    """Build prompt for Gemini."""
    return (
        f"You are a subscription leak detector. Analyze this subscription and recommend an action.\n\n"
        f"Subscription: {subscription.merchant}\n"
        f"Amount: ${subscription.amount}/{subscription.frequency.value}\n"
        f"Duration: {subscription.duration_months} months\n"
        f"Price trend: {subscription.price_trend.value}\n"
        f"Leak score: {subscription.leak_score}/100\n\n"
        f"Recommend one of: keep, review, downgrade, renegotiate, cancel\n\n"
        f"Provide:\n"
        f"1. Action (keep/review/downgrade/renegotiate/cancel)\n"
        f"2. Reasoning (1-2 sentences)\n\n"
        f'Return as JSON: {{"action": "...", "reasoning": "..."}}'
    )


def parse_recommendation(response_text: str) -> dict:
    """Parse Gemini response into action + reasoning."""
    try:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        action_str = data.get("action", "review").lower()
        reasoning = data.get("reasoning", "No reasoning provided")

        action_map = {
            "keep": Action.KEEP,
            "review": Action.REVIEW,
            "downgrade": Action.DOWNGRADE,
            "renegotiate": Action.RENEGOTIATE,
            "cancel": Action.CANCEL,
        }
        action = action_map.get(action_str, Action.REVIEW)

        return {"action": action, "reasoning": reasoning}

    except (json.JSONDecodeError, KeyError, AttributeError):
        return {"action": Action.REVIEW, "reasoning": "Unable to generate recommendation"}


def get_gemini_recommendation(subscription: Subscription) -> dict:
    """Get recommendation from Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        fallback_action = Action(score_to_action(subscription.leak_score))
        return {
            "action": fallback_action,
            "reasoning": f"Based on leak score {subscription.leak_score}/100",
        }

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = build_recommendation_prompt(subscription)
        response = model.generate_content(prompt)
        return parse_recommendation(response.text)
    except Exception:
        fallback_action = Action(score_to_action(subscription.leak_score))
        return {
            "action": fallback_action,
            "reasoning": f"Based on leak score {subscription.leak_score}/100",
        }


def recommend_actions(subscriptions: List[Subscription]) -> List[Subscription]:
    """Use Gemini to generate recommendations for each subscription."""
    for sub in subscriptions:
        result = get_gemini_recommendation(sub)
        sub.action = result["action"]
        sub.reasoning = result["reasoning"]
    return subscriptions
