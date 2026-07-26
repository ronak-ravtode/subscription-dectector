from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.auth.manager import create_access_token
from app.auth.middleware import get_current_user
from app.repositories.user import (
    get_user_by_email,
    create_user,
    authenticate_user,
    get_user_settings,
    update_user_settings
)
from app.models_db import User
from datetime import timedelta
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])

def validate_email(email: str) -> bool:
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email) is not None

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if not validate_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address"
        )
    
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    
    user = create_user(db, user_data.email, user_data.password)
    
    return {
        "message": "Account created successfully",
        "user_id": user.id
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"user_id": user.id},
        expires_delta=timedelta(hours=24)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "created_at": user.created_at,
            "is_active": user.is_active
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
        "is_active": current_user.is_active
    }

@router.post("/forgot-password")
async def forgot_password(
    request_body: dict,
    db: Session = Depends(get_db)
):
    email = request_body.get("email", "")
    
    success_message = "If an account exists with this email, a reset link has been sent."
    
    user = get_user_by_email(db, email)
    if not user:
        return {"message": success_message}
    
    from app.repositories.password_reset import create_reset_token
    from app.services.email import send_password_reset_email
    
    token = create_reset_token(db, user.id)
    send_password_reset_email(user.email, token)
    
    return {"message": success_message}

@router.post("/reset-password")
async def reset_password(
    request_body: dict,
    db: Session = Depends(get_db)
):
    token = request_body.get("token", "")
    new_password = request_body.get("new_password", "")
    
    if not token or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token and new password are required"
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    from app.repositories.password_reset import validate_reset_token, mark_token_used
    from app.auth.manager import get_password_hash
    
    user_id = validate_reset_token(db, token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    
    mark_token_used(db, token)
    
    return {"message": "Password reset successful"}
