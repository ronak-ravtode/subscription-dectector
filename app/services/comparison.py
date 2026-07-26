from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from app.models_db import Analysis, Subscription


def compare_analyses(
    db: Session,
    current_analysis_id: str,
    user_id: str
) -> Optional[Dict]:
    """Compare current analysis with the most recent previous one.
    
    Returns comparison dict or None if no previous analysis exists.
    """
    current = db.query(Analysis).filter(
        Analysis.id == current_analysis_id,
        Analysis.user_id == user_id
    ).first()
    
    if not current:
        return None

    previous = db.query(Analysis).filter(
        Analysis.user_id == user_id,
        Analysis.created_at < current.created_at,
        Analysis.status == "complete"
    ).order_by(Analysis.created_at.desc()).first()

    if not previous:
        return None

    current_subs = db.query(Subscription).filter(
        Subscription.analysis_id == current_analysis_id
    ).all()

    previous_subs = db.query(Subscription).filter(
        Subscription.analysis_id == previous.id
    ).all()

    current_merchants = {s.merchant.lower(): s for s in current_subs}
    previous_merchants = {s.merchant.lower(): s for s in previous_subs}

    current_keys = set(current_merchants.keys())
    previous_keys = set(previous_merchants.keys())

    new_subscriptions = [
        current_merchants[k].merchant
        for k in current_keys - previous_keys
    ]

    removed_subscriptions = [
        previous_merchants[k].merchant
        for k in previous_keys - current_keys
    ]

    price_changes = []
    for key in current_keys & previous_keys:
        curr = current_merchants[key]
        prev = previous_merchants[key]
        if prev.amount > 0:
            change_pct = abs(curr.amount - prev.amount) / prev.amount
            if change_pct > 0.02:
                price_changes.append({
                    "merchant": curr.merchant,
                    "old_amount": prev.amount,
                    "new_amount": curr.amount
                })

    score_change = current.overall_score - previous.overall_score

    return {
        "previous_analysis_id": previous.id,
        "previous_date": previous.created_at.isoformat() if previous.created_at else None,
        "new_subscriptions": new_subscriptions,
        "removed_subscriptions": removed_subscriptions,
        "price_changes": price_changes,
        "score_change": score_change
    }
