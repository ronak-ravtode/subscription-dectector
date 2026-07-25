from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.middleware import get_current_user
from app.auth.schemas import SettingsUpdate, SettingsResponse
from app.repositories.user import get_user_settings, update_user_settings
from app.repositories.analysis import get_user_analyses
from app.models_db import User
from typing import List

router = APIRouter(prefix="/api/user", tags=["user"])

@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    settings_data: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = update_user_settings(
        db,
        current_user.id,
        notification_email=settings_data.notification_email,
        currency=settings_data.currency,
        theme=settings_data.theme
    )
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )
    
    return {
        "notification_email": settings.notification_email,
        "currency": settings.currency,
        "theme": settings.theme
    }

@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = get_user_settings(db, current_user.id)
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found"
        )
    
    return {
        "notification_email": settings.notification_email,
        "currency": settings.currency,
        "theme": settings.theme
    }

@router.get("/history")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyses, total = get_user_analyses(db, current_user.id, page, limit)
    
    return {
        "analyses": [
            {
                "analysis_id": a.id,
                "status": a.status,
                "total_monthly_leak": a.total_monthly_leak,
                "overall_score": a.overall_score,
                "subscription_count": len(a.subscriptions),
                "created_at": a.created_at
            }
            for a in analyses
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

@router.get("/history/{analysis_id}")
async def get_history_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.repositories.analysis import get_analysis_by_id
    
    analysis = get_analysis_by_id(db, analysis_id, current_user.id)
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return {
        "analysis_id": analysis.id,
        "status": analysis.status,
        "total_monthly_leak": analysis.total_monthly_leak,
        "overall_score": analysis.overall_score,
        "subscriptions": [
            {
                "id": s.id,
                "merchant": s.merchant,
                "amount": s.amount,
                "frequency": s.frequency,
                "category": s.category,
                "leak_score": s.leak_score,
                "action": s.action,
                "reasoning": s.reasoning,
                "price_trend": s.price_trend,
                "duration_months": s.duration_months,
                "price_increases": s.price_increases
            }
            for s in analysis.subscriptions
        ],
        "recommendations_summary": {},
        "warnings": analysis.warnings,
        "created_at": analysis.created_at
    }

@router.get("/spending-trend")
async def get_spending_trend(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.repositories.price_history import get_spending_trend
    trend = get_spending_trend(db, current_user.id)
    return {"trend": trend}

@router.get("/subscriptions/{subscription_id}/price-history")
async def get_subscription_price_history(
    subscription_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.repositories.price_history import get_price_history, get_monthly_aggregates
    from app.repositories.subscription import get_user_subscriptions
    
    user_subs = get_user_subscriptions(db, current_user.id)
    sub_ids = [s.id for s in user_subs]
    if subscription_id not in sub_ids:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    history = get_price_history(db, subscription_id, current_user.id)
    aggregates = get_monthly_aggregates(db, subscription_id, current_user.id)
    
    sub = next((s for s in user_subs if s.id == subscription_id), None)
    
    return {
        "subscription_id": subscription_id,
        "merchant": sub.merchant if sub else "",
        "snapshots": [
            {"date": h.recorded_at.isoformat(), "amount": h.amount}
            for h in history
        ],
        "monthly_aggregates": aggregates,
    }

@router.get("/forwarding-address")
async def get_forwarding_address(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.forwarding_address:
        address = current_user.forwarding_address
    else:
        user_id_short = current_user.id[:8]
        address = f"{user_id_short}@subguard.app"
        current_user.forwarding_address = address
        db.commit()
    
    return {
        "forwarding_address": address,
        "instructions": "Forward your bank statement emails to this address. The system will automatically detect subscriptions.",
    }
