from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    forwarding_address = Column(String, unique=True, nullable=True)
    
    settings = relationship("UserSettings", back_populates="user", uselist=False)
    analyses = relationship("Analysis", back_populates="user")

class UserSettings(Base):
    __tablename__ = "user_settings"
    
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    notification_email = Column(Boolean, default=True)
    currency = Column(String, default="USD")
    theme = Column(String, default="light")
    
    user = relationship("User", back_populates="settings")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="processing")
    total_monthly_leak = Column(Float, default=0.0)
    overall_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    warnings = Column(JSON, default=[])
    ai_summary = Column(Text, nullable=True)
    
    user = relationship("User", back_populates="analyses")
    subscriptions = relationship("Subscription", back_populates="analysis")
    transactions = relationship("TransactionRecord", back_populates="analysis")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    merchant = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)
    category = Column(String, nullable=False)
    leak_score = Column(Integer, default=0)
    action = Column(String, default="review")
    reasoning = Column(Text, default="")
    price_trend = Column(String, default="stable")
    duration_months = Column(Integer, default=0)
    price_increases = Column(Integer, default=0)
    
    analysis = relationship("Analysis", back_populates="subscriptions")
    price_history = relationship("PriceHistory", back_populates="subscription")

class PriceHistory(Base):
    __tablename__ = "price_history"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=False)
    amount = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    source_analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    
    subscription = relationship("Subscription", back_populates="price_history")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class TransactionRecord(Base):
    __tablename__ = "transaction_records"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)
    is_recurring = Column(Boolean, default=False)
    
    analysis = relationship("Analysis", back_populates="transactions")
