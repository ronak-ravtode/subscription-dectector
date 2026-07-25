import os
import json
try:
    import google.generativeai as genai
except ImportError:
    genai = None
from typing import List
from dotenv import load_dotenv
from app.models import Subscription

load_dotenv()


def build_summary_prompt(subscriptions: List[Subscription], total_monthly: float) -> str:
    """Build prompt for Gemini to generate analysis summary."""
    sub_list = "\n".join([
        f"- {s.merchant}: ${s.amount}/{s.frequency.value} (score: {s.leak_score}/100, action: {s.action.value})"
        for s in subscriptions
    ])
    return (
        f"You are a subscription leak detector. Summarize this analysis in 2-3 sentences.\n\n"
        f"Total monthly spend: ${total_monthly:.2f}\n"
        f"Number of subscriptions: {len(subscriptions)}\n\n"
        f"Subscriptions:\n{sub_list}\n\n"
        f"Include:\n"
        f"1. Total monthly spend\n"
        f"2. Biggest offender (most expensive subscription)\n"
        f"3. One-line savings tip\n\n"
        f"Keep it brief and conversational."
    )


def generate_ai_summary(subscriptions: List[Subscription], total_monthly: float) -> str:
    """Generate AI summary using Gemini, with fallback to template."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here" or genai is None:
        return _template_summary(subscriptions, total_monthly)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = build_summary_prompt(subscriptions, total_monthly)
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return _template_summary(subscriptions, total_monthly)


def _template_summary(subscriptions: List[Subscription], total_monthly: float) -> str:
    """Fallback template summary when Gemini is unavailable."""
    if not subscriptions:
        return "No subscriptions detected in this analysis."

    sorted_subs = sorted(subscriptions, key=lambda s: s.amount, reverse=True)
    biggest = sorted_subs[0]
    annual = total_monthly * 12

    return (
        f"Your subscriptions total ${total_monthly:.2f}/month (${annual:.2f}/year) "
        f"across {len(subscriptions)} services. "
        f"{biggest.merchant} at ${biggest.amount:.2f}/{biggest.frequency.value} is your biggest expense. "
        f"Review your subscriptions to identify potential savings."
    )
