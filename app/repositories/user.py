from sqlalchemy.orm import Session
from app.models_db import User, UserSettings
from app.auth.manager import get_password_hash, verify_password
from typing import Optional

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, email: str, password: str) -> User:
    hashed_password = get_password_hash(password)
    user = User(email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    settings = UserSettings(user_id=user.id)
    db.add(settings)
    db.commit()
    
    return user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def update_user_settings(db: Session, user_id: str, settings_data: dict) -> Optional[UserSettings]:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        return None
    
    for key, value in settings_data.items():
        if value is not None:
            setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings

def get_user_settings(db: Session, user_id: str) -> Optional[UserSettings]:
    return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
