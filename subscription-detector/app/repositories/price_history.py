from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models_db import PriceHistory, Subscription, Analysis
from typing import List

def get_price_history(db: Session, subscription_id: str, user_id: str) -> List[PriceHistory]:
    """Get all price snapshots for a subscription with user isolation."""
    return db.query(PriceHistory)\
        .join(Subscription, PriceHistory.subscription_id == Subscription.id)\
        .join(Analysis, Subscription.analysis_id == Analysis.id)\
        .filter(
            PriceHistory.subscription_id == subscription_id,
            Analysis.user_id == user_id
        )\
        .order_by(PriceHistory.recorded_at.asc())\
        .all()

def get_monthly_aggregates(db: Session, subscription_id: str, user_id: str) -> List[dict]:
    """Get monthly avg/min/max for a subscription."""
    history = get_price_history(db, subscription_id, user_id)
    if not history:
        return []
    
    monthly = {}
    for record in history:
        month_key = record.recorded_at.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = []
        monthly[month_key].append(record.amount)
    
    aggregates = []
    for month, amounts in sorted(monthly.items()):
        aggregates.append({
            "month": month,
            "avgAmount": round(sum(amounts) / len(amounts), 2),
            "minAmount": round(min(amounts), 2),
            "maxAmount": round(max(amounts), 2),
        })
    
    return aggregates

def get_spending_trend(db: Session, user_id: str) -> List[dict]:
    """Get monthly total spending across all analyses."""
    analyses = db.query(Analysis)\
        .filter(Analysis.user_id == user_id)\
        .order_by(Analysis.created_at.asc())\
        .all()
    
    if not analyses:
        return []
    
    monthly = {}
    for analysis in analyses:
        month_key = analysis.created_at.strftime("%Y-%m")
        if month_key not in monthly:
            monthly[month_key] = 0.0
        monthly[month_key] += analysis.total_monthly_leak or 0.0
    
    trend = []
    for month, amount in sorted(monthly.items()):
        trend.append({
            "month": month,
            "amount": round(amount, 2),
        })
    
    return trend
