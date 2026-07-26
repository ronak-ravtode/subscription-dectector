from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.middleware import get_current_user
from app.auth.schemas import SettingsUpdate, SettingsResponse
from app.repositories.user import get_user_settings, update_user_settings
from app.repositories.analysis import get_user_analyses
from app.models_db import User, EmailCredentials, EmailScanResult
from typing import List, Optional
from datetime import datetime
from app.models import EmailConnectRequest, EmailStatusResponse, EmailScanResponse
from app.services.encryption import encrypt_password, decrypt_password
from app.services.imap_client import verify_connection
from app.services.email_scanner import scan_user_emails, count_detected_subscriptions
from app.services.twilio import send_sms, TWILIO_PHONE_NUMBER

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


@router.post("/email/connect", response_model=dict)
async def connect_email(
    request: EmailConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect Gmail account via IMAP."""
    if not verify_connection(request.email, request.app_password):
        raise HTTPException(status_code=400, detail="Invalid email credentials")

    existing = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id
    ).first()

    encrypted_pw = encrypt_password(request.app_password)

    if existing:
        existing.email = request.email
        existing.encrypted_password = encrypted_pw
        existing.is_active = True
    else:
        credentials = EmailCredentials(
            user_id=current_user.id,
            email=request.email,
            encrypted_password=encrypted_pw,
            is_active=True
        )
        db.add(credentials)

    db.commit()
    return {"status": "connected", "message": "Gmail connected successfully"}


@router.get("/email/status", response_model=EmailStatusResponse)
async def email_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email connection status."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id,
        EmailCredentials.is_active == True
    ).first()

    if not credentials:
        return EmailStatusResponse(connected=False)

    scan_count = db.query(EmailScanResult).filter(
        EmailScanResult.user_id == current_user.id
    ).count()

    sub_count = count_detected_subscriptions(current_user.id, db)

    return EmailStatusResponse(
        connected=True,
        email=credentials.email,
        last_scan=credentials.last_scan,
        emails_scanned=scan_count,
        subscriptions_detected=sub_count
    )


@router.post("/email/scan-now", response_model=EmailScanResponse)
async def scan_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger immediate email scan."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id,
        EmailCredentials.is_active == True
    ).first()

    if not credentials:
        raise HTTPException(status_code=400, detail="No email connected")

    app_password = decrypt_password(credentials.encrypted_password)

    results = scan_user_emails(
        user_id=current_user.id,
        email=credentials.email,
        app_password=app_password,
        db=db
    )

    credentials.last_scan = datetime.utcnow()
    db.commit()

    return EmailScanResponse(
        status="completed",
        emails_scanned=results["emails_scanned"],
        new_emails=results["new_emails"],
        transactions_found=results["transactions_found"],
        subscriptions_detected=results["subscriptions_detected"]
    )


@router.delete("/email/disconnect")
async def disconnect_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect email account."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id
    ).first()

    if credentials:
        db.delete(credentials)
        db.commit()

    return {"status": "disconnected"}


@router.get("/email/results")
async def get_email_results(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email scan results with details."""
    results = db.query(EmailScanResult).filter(
        EmailScanResult.user_id == current_user.id
    ).order_by(EmailScanResult.scanned_at.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "message_id": r.message_id,
            "subject": r.subject,
            "from_email": r.from_email,
            "received_date": r.received_date.isoformat() if r.received_date else None,
            "transactions": r.transactions_json or [],
            "is_recurring": r.is_recurring,
            "merchant_detected": r.merchant_detected,
            "amount_detected": r.amount_detected,
            "scanned_at": r.scanned_at.isoformat() if r.scanned_at else None,
        }
        for r in results
    ]


# ── SMS Settings ──────────────────────────────────────────────────────────────

class SmsSettingsUpdate(BaseModel):
    phone_number: Optional[str] = None
    sms_forwarding_enabled: Optional[bool] = None


class SmsSettingsResponse(BaseModel):
    phone_number: Optional[str]
    sms_forwarding_enabled: bool
    forwarding_number: Optional[str]


@router.get("/sms-settings", response_model=SmsSettingsResponse)
async def get_sms_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {
        "phone_number": current_user.phone_number,
        "sms_forwarding_enabled": current_user.sms_forwarding_enabled,
        "forwarding_number": TWILIO_PHONE_NUMBER or None,
    }


@router.put("/sms-settings", response_model=SmsSettingsResponse)
async def update_sms_settings(
    settings_data: SmsSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if settings_data.phone_number is not None:
        current_user.phone_number = settings_data.phone_number
    if settings_data.sms_forwarding_enabled is not None:
        current_user.sms_forwarding_enabled = settings_data.sms_forwarding_enabled
    db.commit()
    db.refresh(current_user)

    return {
        "phone_number": current_user.phone_number,
        "sms_forwarding_enabled": current_user.sms_forwarding_enabled,
        "forwarding_number": TWILIO_PHONE_NUMBER or None,
    }


@router.post("/sms-test")
async def test_sms_forwarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.phone_number:
        raise HTTPException(status_code=400, detail="Phone number not set")

    if not TWILIO_PHONE_NUMBER:
        raise HTTPException(status_code=500, detail="Twilio not configured")

    success = send_sms(
        to=current_user.phone_number,
        body="Test SMS from SubGuard. If you received this, forwarding is working!"
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test SMS")

    return {"message": "Test SMS sent successfully"}
