import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.repositories.user import create_user, get_user_by_email, authenticate_user
from app.repositories.analysis import (
    create_analysis, get_analysis_by_id, update_analysis_status,
    add_subscription_to_analysis
)
from app.repositories.subscription import (
    find_matching_subscription, get_subscriptions_by_analysis,
    get_user_subscriptions, record_price_history, get_price_history
)

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_create_user(db):
    user = create_user(db, "test@example.com", "password123")
    assert user.email == "test@example.com"
    assert user.id is not None

def test_get_user_by_email(db):
    create_user(db, "test@example.com", "password123")
    user = get_user_by_email(db, "test@example.com")
    assert user is not None
    assert user.email == "test@example.com"

def test_authenticate_user(db):
    create_user(db, "test@example.com", "password123")
    user = authenticate_user(db, "test@example.com", "password123")
    assert user is not None

def test_authenticate_wrong_password(db):
    create_user(db, "test@example.com", "password123")
    user = authenticate_user(db, "test@example.com", "wrongpassword")
    assert user is None

def test_create_analysis(db):
    user = create_user(db, "test@example.com", "password123")
    analysis = create_analysis(db, user.id, "analysis-123")
    assert analysis.id == "analysis-123"
    assert analysis.user_id == user.id

def test_get_analysis_by_id(db):
    user = create_user(db, "test@example.com", "password123")
    create_analysis(db, user.id, "analysis-123")
    analysis = get_analysis_by_id(db, "analysis-123", user.id)
    assert analysis is not None

def test_analysis_user_isolation(db):
    user1 = create_user(db, "user1@example.com", "password123")
    user2 = create_user(db, "user2@example.com", "password123")
    
    create_analysis(db, user1.id, "analysis-1")
    
    analysis = get_analysis_by_id(db, "analysis-1", user2.id)
    assert analysis is None


class TestSubscriptionRepo:
    def test_find_matching_subscription_exact_merchant(self, db):
        user = create_user(db, "sub@test.com", "password123")
        analysis = create_analysis(db, user.id, "a1")
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Netflix",
            "amount": 10.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        match = find_matching_subscription(db, user.id, "Netflix", "entertainment")
        assert match is not None
        assert match.merchant == "Netflix"

    def test_find_matching_subscription_fuzzy_merchant(self, db):
        user = create_user(db, "sub@test.com", "password123")
        analysis = create_analysis(db, user.id, "a1")
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Netflix",
            "amount": 10.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        match = find_matching_subscription(db, user.id, "Netflx", "entertainment")
        assert match is not None

    def test_find_matching_no_match_different_category(self, db):
        """Category-only match should NOT return a result (bug fix verified)."""
        user = create_user(db, "sub@test.com", "password123")
        analysis = create_analysis(db, user.id, "a1")
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Netflix",
            "amount": 10.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        match = find_matching_subscription(db, user.id, "Spotify", "entertainment")
        assert match is None

    def test_find_matching_user_isolation(self, db):
        user1 = create_user(db, "u1@test.com", "password123")
        user2 = create_user(db, "u2@test.com", "password123")
        create_analysis(db, user1.id, "a1")
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Netflix",
            "amount": 10.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        match = find_matching_subscription(db, user2.id, "Netflix", "entertainment")
        assert match is None

    def test_get_subscriptions_by_analysis(self, db):
        user = create_user(db, "sub@test.com", "password123")
        create_analysis(db, user.id, "a1")
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Netflix",
            "amount": 10.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        add_subscription_to_analysis(db, "a1", {
            "merchant": "Hulu",
            "amount": 8.0,
            "frequency": "monthly",
            "category": "entertainment",
        })
        subs = get_subscriptions_by_analysis(db, "a1")
        assert len(subs) == 2

    def test_update_analysis_status(self, db):
        user = create_user(db, "status@test.com", "password123")
        create_analysis(db, user.id, "a1")
        result = update_analysis_status(db, "a1", "complete", total_monthly_leak=25.0, overall_score=65, warnings=["test warning"])
        assert result.status == "complete"
        assert result.total_monthly_leak == 25.0
        assert result.overall_score == 65
        assert "test warning" in result.warnings

