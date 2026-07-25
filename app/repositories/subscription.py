from sqlalchemy.orm import Session
from app.models_db import Subscription, PriceHistory, Analysis
from typing import List, Optional
from difflib import SequenceMatcher

def get_subscriptions_by_analysis(db: Session, analysis_id: str) -> List[Subscription]:
    return db.query(Subscription).filter(Subscription.analysis_id == analysis_id).all()

def get_user_subscriptions(db: Session, user_id: str) -> List[Subscription]:
    return db.query(Subscription).join(Analysis).filter(Analysis.user_id == user_id).all()

def find_matching_subscription(
    db: Session,
    user_id: str,
    merchant: str,
    category: str
) -> Optional[Subscription]:
    previous_subscriptions = db.query(Subscription).join(Analysis).filter(
        Analysis.user_id == user_id
    ).all()
    
    for sub in previous_subscriptions:
        if merchants_match(sub.merchant, merchant):
            return sub
    
    return None

def merchants_match(merchant1: str, merchant2: str) -> bool:
    ratio = SequenceMatcher(None, merchant1.lower(), merchant2.lower()).ratio()
    return ratio > 0.8

def record_price_history(
    db: Session,
    subscription_id: str,
    amount: float,
    source_analysis_id: str
) -> PriceHistory:
    history = PriceHistory(
        subscription_id=subscription_id,
        amount=amount,
        source_analysis_id=source_analysis_id
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history

def get_price_history(db: Session, subscription_id: str) -> List[PriceHistory]:
    return db.query(PriceHistory).filter(
        PriceHistory.subscription_id == subscription_id
    ).order_by(PriceHistory.recorded_at.asc()).all()
