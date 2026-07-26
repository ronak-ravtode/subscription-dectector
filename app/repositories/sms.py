from sqlalchemy.orm import Session
from app.models_db import SmsMessage


def save_sms_message(
    db: Session,
    user_id: str,
    message_sid: str,
    sender: str | None,
    body: str,
    parsed_transactions: list[dict],
) -> SmsMessage:
    """Save an incoming SMS message and mark as processed."""
    sms = SmsMessage(
        user_id=user_id,
        message_sid=message_sid,
        sender=sender,
        body=body,
        parsed_transactions=parsed_transactions,
        is_processed=True,
    )
    db.add(sms)
    db.commit()
    db.refresh(sms)
    return sms


def is_duplicate(db: Session, message_sid: str) -> bool:
    """Check if an SMS with this Twilio MessageSid already exists."""
    return db.query(SmsMessage).filter(SmsMessage.message_sid == message_sid).first() is not None


def get_user_sms_messages(db: Session, user_id: str, limit: int = 50) -> list[SmsMessage]:
    """Get recent SMS messages for a user."""
    return (
        db.query(SmsMessage)
        .filter(SmsMessage.user_id == user_id)
        .order_by(SmsMessage.created_at.desc())
        .limit(limit)
        .all()
    )
