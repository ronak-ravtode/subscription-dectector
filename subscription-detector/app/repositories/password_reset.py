from sqlalchemy.orm import Session
from app.models_db import PasswordResetToken, User
from datetime import datetime, timedelta
import secrets

def create_reset_token(db: Session, user_id: str) -> str:
    """Generate a password reset token."""
    db.query(PasswordResetToken)\
        .filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used == False
        )\
        .update({"used": True})
    
    token = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    reset_token = PasswordResetToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(reset_token)
    db.commit()
    
    return token

def validate_reset_token(db: Session, token: str):
    """Validate a reset token. Returns user_id if valid, None otherwise."""
    reset_token = db.query(PasswordResetToken)\
        .filter(PasswordResetToken.token == token)\
        .first()
    
    if not reset_token:
        return None
    if reset_token.used:
        return None
    if reset_token.expires_at < datetime.utcnow():
        return None
    
    return reset_token.user_id

def mark_token_used(db: Session, token: str):
    """Mark a token as used."""
    db.query(PasswordResetToken)\
        .filter(PasswordResetToken.token == token)\
        .update({"used": True})
    db.commit()
