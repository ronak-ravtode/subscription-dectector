from sqlalchemy.orm import Session
from app.models_db import Analysis, Subscription
from typing import List, Optional

def create_analysis(db: Session, user_id: str, analysis_id: str) -> Analysis:
    analysis = Analysis(id=analysis_id, user_id=user_id)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis

def get_analysis_by_id(db: Session, analysis_id: str, user_id: str) -> Optional[Analysis]:
    return db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.user_id == user_id
    ).first()

def update_analysis_status(
    db: Session,
    analysis_id: str,
    status: str,
    total_monthly_leak: float = 0.0,
    overall_score: int = 0,
    warnings: list = None
) -> Optional[Analysis]:
    if warnings is None:
        warnings = []
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        return None
    
    analysis.status = status
    analysis.total_monthly_leak = total_monthly_leak
    analysis.overall_score = overall_score
    analysis.warnings = warnings
    
    db.commit()
    db.refresh(analysis)
    return analysis

def get_user_analyses(
    db: Session,
    user_id: str,
    page: int = 1,
    limit: int = 20
) -> tuple[List[Analysis], int]:
    query = db.query(Analysis).filter(Analysis.user_id == user_id)
    total = query.count()
    analyses = query.order_by(Analysis.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return analyses, total

def add_subscription_to_analysis(
    db: Session,
    analysis_id: str,
    subscription_data: dict
) -> Subscription:
    subscription = Subscription(analysis_id=analysis_id, **subscription_data)
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription
