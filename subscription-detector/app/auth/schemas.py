from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    is_active: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class SettingsUpdate(BaseModel):
    notification_email: Optional[bool] = None
    currency: Optional[str] = None
    theme: Optional[str] = None

class SettingsResponse(BaseModel):
    notification_email: bool
    currency: str
    theme: str
