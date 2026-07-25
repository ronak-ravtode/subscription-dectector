import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.services.webhook import verify_webhook_signature

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_webhook_unknown_user():
    """Test that unknown forwarding address is ignored."""
    response = client.post("/api/inbound-email", data={
        "to": "unknown@example.com",
        "text": "Hello",
        "html": "",
        "attachments": "[]"
    }, headers={"X-Twilio-Email-Event-Webhook-Signature": ""})
    assert response.status_code == 200
    assert response.json()["status"] == "ignored"


def test_webhook_no_attachments_fallback():
    """Test email body fallback when no PDF attachments."""
    from app.repositories.user import create_user
    db = TestingSessionLocal()
    try:
        user = create_user(db, "webhook@test.com", "password123")
        user_id = user.id
    finally:
        db.close()

    with patch('app.services.webhook.WEBHOOK_SECRET', ''):
        response = client.post("/api/inbound-email", data={
            "to": f"{user_id}@forward.example.com",
            "text": "07/20/2026 $10.00 Netflix Subscription",
            "html": "",
            "attachments": "[]"
        }, headers={"X-Twilio-Email-Event-Webhook-Signature": ""})
        assert response.status_code == 200
        assert response.json()["status"] == "processed"


def test_webhook_signature_verification_no_secret():
    """Test that webhook passes when no secret is configured."""
    assert verify_webhook_signature(b"payload", "anything") is True


def test_webhook_signature_verification_valid():
    """Test valid signature verification."""
    import hashlib
    import hmac as hmac_module
    secret = "test-secret"
    payload = b"test-payload"
    expected = hmac_module.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    with patch('app.services.webhook.WEBHOOK_SECRET', secret):
        assert verify_webhook_signature(payload, expected) is True


def test_webhook_signature_verification_invalid():
    """Test invalid signature is rejected."""
    with patch('app.services.webhook.WEBHOOK_SECRET', "test-secret"):
        assert verify_webhook_signature(b"payload", "wrong-sig") is False
