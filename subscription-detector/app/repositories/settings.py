from sqlalchemy.orm import Session
from app.models_db import UserSettings
from typing import Optional

def get_settings(db: Session, user_id: str) -> Optional[UserSettings]:
    return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

def update_settings(db: Session, user_id: str, **kwargs) -> Optional[UserSettings]:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        return None
    
    for key, value in kwargs.items():
        if value is not None:
            setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    return settings
