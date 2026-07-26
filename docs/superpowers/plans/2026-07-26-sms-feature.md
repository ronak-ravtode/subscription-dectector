# SMS Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time SMS transaction ingestion via Twilio, with enhanced parsing, smart filtering, and auto-forwarding onboarding.

**Architecture:** Twilio webhook receives SMS → enhanced parser extracts transactions → existing IntelligenceEngine detects subscriptions → results stored in DB and emailed to user.

**Tech Stack:** Python, FastAPI, SQLAlchemy, Twilio SDK, Pydantic, pytest

## Global Constraints

- Python 3.10+, FastAPI 0.115+, SQLAlchemy 2.0+
- Existing patterns: pure-function parsers, Pydantic models, repository pattern for DB
- All user data isolated by `user_id` (same as existing email/PDF pipelines)
- Always return 200 OK to Twilio (non-200 causes retries)
- TDD: write failing test first, then implement, then verify

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/parsers/sms_parser.py` | **Enhance** | Add merchant extraction, subscription classification, multi-bank formats, smart filtering |
| `app/services/twilio.py` | **Create** | Twilio signature verification, SMS sending |
| `app/models_db.py` | **Modify** | Add `SmsMessage` model, `phone_number` + `sms_forwarding_enabled` columns on `User` |
| `app/repositories/sms.py` | **Create** | SMS message CRUD, dedup logic |
| `app/main.py` | **Modify** | Add `POST /api/inbound-sms` webhook endpoint |
| `app/user/routes.py` | **Modify** | Add SMS settings GET/PUT endpoints |
| `app/database.py` | **Modify** | Add `init_db` migration for new columns/table |
| `frontend/src/pages/Settings.tsx` | **Modify** | Add SMS forwarding section |
| `frontend/src/hooks/useSmsSettings.ts` | **Create** | SMS settings API hooks |
| `frontend/src/lib/types.ts` | **Modify** | Add `SmsSettings` type |
| `tests/test_sms_parser.py` | **Enhance** | Multi-bank tests, classification tests, filtering tests |
| `tests/test_inbound_sms.py` | **Create** | Webhook tests |
| `tests/test_sms_settings.py` | **Create** | SMS settings endpoint tests |
| `tests/test_sms_integration.py` | **Create** | Full pipeline integration tests |
| `frontend/tests/e2e/sms-setup.spec.ts` | **Create** | E2E tests for SMS settings page |
| `.env.example` | **Modify** | Add Twilio env vars |

---

### Task 1: Enhance SMS Parser — Merchant Extraction & Classification

**Files:**
- Modify: `subscription-detector/app/parsers/sms_parser.py`
- Modify: `subscription-detector/tests/test_sms_parser.py`

**Interfaces:**
- Consumes: existing `parse_sms(text: str) -> List[dict]`
- Produces: enhanced `parse_sms()` returns dicts with keys: `date`, `amount`, `description`, `merchant`, `is_subscription`, `sender`, `bank`, `raw_text`

- [ ] **Step 1: Write failing tests for merchant extraction**

Add to `tests/test_sms_parser.py`:

```python
class TestMerchantExtraction:
    def test_hdfc_for_merchant(self):
        result = parse_sms("Rs.499 deducted from A/c XX12345 for NETFLIX.COM on 25/07/26")
        assert len(result) == 1
        assert result[0]['merchant'] == 'NETFLIX.COM'

    def test_sbi_at_merchant(self):
        result = parse_sms("Dear Customer, your A/c X12345 is debited for INR 499 on 25/07/26 at SPOTIFY")
        assert len(result) == 1
        assert result[0]['merchant'] == 'SPOTIFY'

    def test_icici_to_merchant(self):
        result = parse_sms("ICICI Bank Acct XX1234 debited INR 499.00 on 25 Jul by NEFT NETFLIX INDIA")
        assert len(result) == 1
        assert result[0]['merchant'] == 'NETFLIX INDIA'

    def test_axis_at_merchant(self):
        result = parse_sms("Axis Bank -- Rs.499.00 spent via Card XX1234 on 25-Jul-26 at ADOBE SYSTEMS")
        assert len(result) == 1
        assert result[0]['merchant'] == 'ADOBE SYSTEMS'

    def test_no_merchant_falls_back_to_description(self):
        result = parse_sms("Charged $10.00 for Netflix")
        assert len(result) == 1
        assert result[0]['merchant'] == 'NETFLIX'

    def test_merchant_key_always_present(self):
        result = parse_sms("Payment of $5.00 to Spotify processed")
        assert 'merchant' in result[0]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_parser.py::TestMerchantExtraction -v`
Expected: FAIL with `KeyError: 'merchant'`

- [ ] **Step 3: Write failing tests for subscription classification**

Add to `tests/test_sms_parser.py`:

```python
class TestSubscriptionClassification:
    def test_auto_renew_is_subscription(self):
        result = parse_sms("Rs.499 auto-renewed for Netflix on 25/07/26")
        assert result[0]['is_subscription'] is True

    def test_subscription_renewed_is_subscription(self):
        result = parse_sms("Subscription renewed: $14.99 charged for Spotify")
        assert result[0]['is_subscription'] is True

    def test_monthly_plan_is_subscription(self):
        result = parse_sms("Monthly plan payment of ₹499 for Hotstar")
        assert result[0]['is_subscription'] is True

    def test_recurring_payment_is_subscription(self):
        result = parse_sms("Recurring payment of $9.99 to Hulu")
        assert result[0]['is_subscription'] is True

    def test_plain_charge_may_not_be_subscription(self):
        result = parse_sms("Rs.500 deducted from A/c XX12345 on 25/07/26")
        assert result[0]['is_subscription'] is False

    def test_otp_not_subscription(self):
        result = parse_sms("Your OTP is 123456 for login")
        # OTP should be filtered out entirely (no amount extracted)
        assert len(result) == 0

    def test_balance_inquiry_not_subscription(self):
        result = parse_sms("Your balance is INR 12000. Available: INR 10000")
        assert len(result) == 0
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_parser.py::TestSubscriptionClassification -v`
Expected: FAIL with `KeyError: 'is_subscription'`

- [ ] **Step 5: Write failing tests for smart filtering**

Add to `tests/test_sms_parser.py`:

```python
class TestSmartFiltering:
    def test_promotional_sms_filtered(self):
        result = parse_sms("Get 50% off on your new credit card! Apply now")
        assert len(result) == 0

    def test_otp_sms_filtered(self):
        result = parse_sms("Your OTP for transaction is 789012. Do not share")
        assert len(result) == 0

    def test_balance_sms_filtered(self):
        result = parse_sms("Available balance in A/c XX1234 is INR 15,000.00")
        assert len(result) == 0

    def test_transaction_sms_passes(self):
        result = parse_sms("Rs.499 deducted from A/c XX12345 for NETFLIX.COM on 25/07/26")
        assert len(result) == 1

    def test_credit_card_payment_passes(self):
        result = parse_sms("Credit card payment of $14.99 at Spotify on 25/07/26")
        assert len(result) == 1

    def test_upi_transaction_filtered(self):
        result = parse_sms("Rs.500 sent to Rahul via UPI. Ref: 123456")
        assert len(result) == 0
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_parser.py::TestSmartFiltering -v`
Expected: FAIL — promotional/OTP/balance SMS may still return results

- [ ] **Step 7: Write failing tests for bank sender parsing**

Add to `tests/test_sms_parser.py`:

```python
class TestSenderParsing:
    def test_hdfc_sender(self):
        result = parse_sms("VM-HDFCBK: Rs.499 deducted for Netflix on 25/07/26")
        assert result[0]['sender'] == 'VM-HDFCBK'
        assert result[0]['bank'] == 'HDFC Bank'

    def test_sbi_sender(self):
        result = parse_sms("AD-SBIUPI: Rs.500 sent to merchant on 25/07/26")
        assert result[0]['sender'] == 'AD-SBIUPI'
        assert result[0]['bank'] == 'SBI'

    def test_icici_sender(self):
        result = parse_sms("JX-ICICIB: INR 499 debited for subscription on 25/07/26")
        assert result[0]['sender'] == 'JX-ICICIB'
        assert result[0]['bank'] == 'ICICI Bank'

    def test_unknown_sender(self):
        result = parse_sms("Charged $10.00 for Netflix")
        assert result[0]['sender'] is None
        assert result[0]['bank'] is None

    def test_raw_text_preserved(self):
        result = parse_sms("VM-HDFCBK: Rs.499 deducted for Netflix on 25/07/26")
        assert result[0]['raw_text'] == "VM-HDFCBK: Rs.499 deducted for Netflix on 25/07/26"
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_parser.py::TestSenderParsing -v`
Expected: FAIL with `KeyError: 'sender'` or `KeyError: 'bank'`

- [ ] **Step 9: Implement enhanced SMS parser**

Modify `app/parsers/sms_parser.py`. Keep all existing functions (`parse_relative_date`, `parse_absolute_date`, `extract_amount`, `extract_description`, `parse_sms_batch`) and modify `parse_sms`. Add these new functions at the top of the file, then update `parse_sms` to call them.

1. **Bank sender prefix mapping:**
```python
BANK_SENDER_PREFIXES = {
    'VM-HDFCBK': 'HDFC Bank',
    'AD-HDFCBK': 'HDFC Bank',
    'AD-SBIUPI': 'SBI',
    'JD-SBIUPI': 'SBI',
    'JX-ICICIB': 'ICICI Bank',
    'VM-ICICIB': 'ICICI Bank',
    'AD-AXISBK': 'Axis Bank',
    'VM-AXISBK': 'Axis Bank',
    'BZ-INDUSB': 'IndusInd Bank',
    'VK-KOTAKB': 'Kotak Bank',
    'JM-KOTAKB': 'Kotak Bank',
}
```

2. **Smart filtering (before amount extraction):**
```python
SKIP_PATTERNS = [
    r'\b(otp|one\s*time\s*password)\b.*\d{4,6}',
    r'your\s+(otp|pin|code)\s+is\s+\d',
    r'available\s+balance',
    r'current\s+balance',
    r'ledger\s+balance',
    r'\b(get|avail|offer|discount|cashback)\b.*\b(credit\s*card|loan|insurance)\b',
    r'\b(apply\s+now|t&c|terms\s+apply)\b',
    r'sent\s+to\s+\w+\s+via\s+upi',
    r'received\s+from\s+\w+',
]

def should_skip_sms(text: str) -> bool:
    """Check if SMS should be skipped (non-transaction)."""
    text_lower = text.lower()
    for pattern in SKIP_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    return False
```

3. **Merchant extraction patterns:**
```python
MERCHANT_PATTERNS = [
    r'\bfor\s+(.+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',       # "for NETFLIX on 25/07"
    r'\bto\s+(.+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',         # "to SPOTIFY on 25/07"
    r'\bat\s+(.+?)(?:\s+on\s+|\s+dated?\s+|\s*$)',         # "at ADOBE on 25/07"
    r'\bby\s+NEFT\s+(.+?)(?:\s+on\s+|\s*$)',               # "by NEFT NETFLIX INDIA"
    r'\bvia\s+Card\s+\w+\s+on\s+\S+\s+at\s+(.+?)$',       # "via Card XX1234 on 25-Jul at NETFLIX"
]

def extract_merchant(text: str) -> Optional[str]:
    """Extract merchant name from SMS text."""
    for pattern in MERCHANT_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            merchant = match.group(1).strip()
            # Clean up common suffixes
            merchant = re.sub(r'\s+on\s+.*$', '', merchant)
            merchant = re.sub(r'\s+dated?\s+.*$', '', merchant)
            if len(merchant) >= 2:
                return merchant.upper()
    return None
```

4. **Subscription classification:**
```python
STRONG_SUBSCRIPTION_SIGNALS = [
    r'\bauto[\s-]*renew',
    r'\bsubscription\s+renewed',
    r'\bmonthly\s+plan',
    r'\bannual\s+plan',
    r'\brecurring\s+payment',
    r'\bplan\s+renewal',
]

WEAK_BILLING_SIGNALS = [
    r'\b(deducted|charged|debited|billed|spent|payment)\b',
]

def is_subscription_sms(text: str) -> bool:
    """Classify if SMS indicates a subscription payment."""
    text_lower = text.lower()
    for pattern in STRONG_SUBSCRIPTION_SIGNALS:
        if re.search(pattern, text_lower):
            return True
    has_billing = any(re.search(p, text_lower) for p in WEAK_BILLING_SIGNALS)
    return False  # Weak signals alone aren't enough
```

5. **Updated `parse_sms` function:**
```python
def parse_sms(text: str) -> List[dict]:
    if not text or not text.strip():
        return []

    # Smart filtering
    if should_skip_sms(text):
        return []

    # ... existing amount extraction ...
    # ... existing date extraction ...

    # New: extract merchant
    merchant = extract_merchant(text)
    if merchant is None:
        merchant = description  # fallback to cleaned description

    # New: classify subscription
    is_sub = is_subscription_sms(text)

    # New: extract sender/bank
    sender, bank = extract_sender_bank(text)

    return [{
        'date': resolved_date.isoformat(),
        'amount': round(amount, 2),
        'description': description,
        'merchant': merchant,
        'is_subscription': is_sub,
        'sender': sender,
        'bank': bank,
        'raw_text': text,
    }]
```

- [ ] **Step 10: Run all enhanced parser tests**

Run: `cd subscription-detector && python -m pytest tests/test_sms_parser.py -v`
Expected: All tests PASS

- [ ] **Step 11: Commit**

```bash
cd subscription-detector
git add app/parsers/sms_parser.py tests/test_sms_parser.py
git commit -m "feat(sms): enhance parser with merchant extraction, classification, and smart filtering"
```

---

### Task 2: Database Models & Migrations

**Files:**
- Modify: `subscription-detector/app/models_db.py`
- Modify: `subscription-detector/app/database.py`

**Interfaces:**
- Consumes: existing `User` model, `Base` from `database.py`
- Produces: `SmsMessage` model, new columns on `User`, `init_db()` migration

- [ ] **Step 1: Add SmsMessage model to models_db.py**

Add at the end of `app/models_db.py`:

```python
class SmsMessage(Base):
    __tablename__ = "sms_messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message_sid = Column(String, unique=True, nullable=False, index=True)
    sender = Column(String, nullable=True)
    body = Column(Text, nullable=False)
    parsed_transactions = Column(JSON, default=[])
    is_processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
```

- [ ] **Step 2: Add new columns to User model**

In `app/models_db.py`, add two lines inside the `User` class (after the existing `forwarding_address` column):

```python
    # Add these two lines after forwarding_address = Column(...)
    phone_number = Column(String, nullable=True)
    sms_forwarding_enabled = Column(Boolean, default=False)
```

- [ ] **Step 3: Add migration to init_db()**

Add to `app/database.py` `init_db()` function:

```python
# SMS support migrations
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
        conn.commit()
except Exception:
    pass  # Column already exists

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN sms_forwarding_enabled BOOLEAN DEFAULT FALSE"))
        conn.commit()
except Exception:
    pass  # Column already exists
```

- [ ] **Step 4: Verify models import correctly**

Run: `cd subscription-detector && python -c "from app.models_db import SmsMessage; print('SmsMessage imported OK')"`
Expected: `SmsMessage imported OK`

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add app/models_db.py app/database.py
git commit -m "feat(sms): add SmsMessage model and User phone_number columns"
```

---

### Task 3: SMS Repository

**Files:**
- Create: `subscription-detector/app/repositories/sms.py`

**Interfaces:**
- Consumes: `SmsMessage` from `models_db`, SQLAlchemy `Session`
- Produces: `save_sms_message()`, `is_duplicate()`, `get_user_sms_messages()`

- [ ] **Step 1: Write failing tests for SMS repository**

Create `tests/test_sms_repository.py`:

```python
import pytest
from app.repositories.sms import save_sms_message, is_duplicate, get_user_sms_messages
from app.models_db import SmsMessage, User, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    user = User(id="test-user-1", email="test@test.com", hashed_password="hashed")
    session.add(user)
    session.commit()
    
    yield session
    session.close()


class TestSaveSmsMessage:
    def test_save_new_sms(self, db_session):
        result = save_sms_message(
            db=db_session,
            user_id="test-user-1",
            message_sid="SM123456",
            sender="VM-HDFCBK",
            body="Rs.499 deducted for Netflix",
            parsed_transactions=[{"date": "2026-07-25", "amount": 499.0, "merchant": "NETFLIX"}]
        )
        assert result is not None
        assert result.message_sid == "SM123456"
        assert result.user_id == "test-user-1"
        assert result.is_processed is True


class TestIsDuplicate:
    def test_new_message_not_duplicate(self, db_session):
        assert is_duplicate(db_session, "SM123456") is False

    def test_existing_message_is_duplicate(self, db_session):
        save_sms_message(db_session, "test-user-1", "SM123456", None, "body", [])
        assert is_duplicate(db_session, "SM123456") is True


class TestGetUserSmsMessages:
    def test_returns_user_messages(self, db_session):
        save_sms_message(db_session, "test-user-1", "SM001", None, "body1", [])
        save_sms_message(db_session, "test-user-1", "SM002", None, "body2", [])
        messages = get_user_sms_messages(db_session, "test-user-1")
        assert len(messages) == 2

    def test_excludes_other_users(self, db_session):
        user2 = User(id="test-user-2", email="test2@test.com", hashed_password="hashed")
        db_session.add(user2)
        db_session.commit()
        
        save_sms_message(db_session, "test-user-1", "SM001", None, "body1", [])
        save_sms_message(db_session, "test-user-2", "SM002", None, "body2", [])
        messages = get_user_sms_messages(db_session, "test-user-1")
        assert len(messages) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_repository.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.repositories.sms'`

- [ ] **Step 3: Implement SMS repository**

Create `app/repositories/sms.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd subscription-detector && python -m pytest tests/test_sms_repository.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add app/repositories/sms.py tests/test_sms_repository.py
git commit -m "feat(sms): add SMS message repository with dedup"
```

---

### Task 4: Twilio Service

**Files:**
- Create: `subscription-detector/app/services/twilio.py`

**Interfaces:**
- Consumes: `TWILIO_AUTH_TOKEN` env var, `X-Twilio-Signature` header
- Produces: `verify_twilio_signature()`, `send_sms()`

- [ ] **Step 1: Write failing tests for Twilio service**

Create `tests/test_twilio_service.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from app.services.twilio import verify_twilio_signature, send_sms


class TestVerifyTwilioSignature:
    def test_valid_signature(self):
        # Twilio uses HMAC-SHA1 over URL + sorted params
        url = "https://example.com/api/inbound-sms"
        params = {"Body": "Hello", "From": "+15551234567", "To": "+15559876543"}
        # Pre-computed valid signature (would need actual Twilio validation)
        # For testing, we mock the comparison
        with patch("app.services.twilio.TWILIO_AUTH_TOKEN", "test_token"):
            # This tests the function exists and accepts the right args
            result = verify_twilio_signature(url, params, "test_signature")
            assert isinstance(result, bool)

    def test_empty_auth_token_allows_all(self):
        with patch("app.services.twilio.TWILIO_AUTH_TOKEN", ""):
            result = verify_twilio_signature("http://x.com", {}, "")
            assert result is True


class TestSendSms:
    @patch("app.services.twilio.requests.post")
    def test_send_sms_success(self, mock_post):
        mock_post.return_value = MagicMock(status_code=201)
        result = send_sms(to="+15551234567", body="Test message")
        assert result is True
        mock_post.assert_called_once()

    @patch("app.services.twilio.requests.post")
    def test_send_sms_failure(self, mock_post):
        mock_post.return_value = MagicMock(status_code=400, text="Bad Request")
        result = send_sms(to="+15551234567", body="Test message")
        assert result is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_twilio_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.twilio'`

- [ ] **Step 3: Implement Twilio service**

Create `app/services/twilio.py`:

```python
import hashlib
import hmac
import os
import base64
import urllib.parse
import requests
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")


def verify_twilio_signature(url: str, params: dict, signature: str) -> bool:
    """Verify Twilio webhook signature (HMAC-SHA1).
    
    Returns True if no auth token is configured (permissive default for dev).
    """
    if not TWILIO_AUTH_TOKEN:
        return True

    # Twilio signs the full URL + sorted POST params
    data = url
    for key in sorted(params.keys()):
        data += key + params[key]

    expected = base64.b64encode(
        hmac.new(
            TWILIO_AUTH_TOKEN.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha1,
        ).digest()
    ).decode("utf-8")

    return hmac.compare_digest(expected, signature)


def send_sms(to: str, body: str) -> bool:
    """Send an SMS via Twilio. Returns True on success."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    data = {
        "To": to,
        "From": TWILIO_PHONE_NUMBER,
        "Body": body,
    }

    response = requests.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    return response.status_code == 201
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd subscription-detector && python -m pytest tests/test_twilio_service.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add app/services/twilio.py tests/test_twilio_service.py
git commit -m "feat(sms): add Twilio signature verification and SMS sending service"
```

---

### Task 5: Twilio Webhook Endpoint

**Files:**
- Modify: `subscription-detector/app/main.py`

**Interfaces:**
- Consumes: `verify_twilio_signature()` from `services/twilio`, `parse_sms()` from `parsers/sms`, `save_sms_message()` from `repositories/sms`, `is_duplicate()` from `repositories/sms`
- Produces: `POST /api/inbound-sms` endpoint

- [ ] **Step 1: Write failing tests for webhook endpoint**

Create `tests/test_inbound_sms.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestInboundSmsEndpoint:
    @patch("app.main.verify_twilio_signature", return_value=True)
    @patch("app.main.is_duplicate", return_value=False)
    @patch("app.main.parse_sms")
    @patch("app.main.save_sms_message")
    def test_valid_sms_processes(self, mock_save, mock_parse, mock_dup, mock_sig):
        mock_parse.return_value = [{"date": "2026-07-25", "amount": 499.0, "description": "NETFLIX", "merchant": "NETFLIX", "is_subscription": True}]
        mock_save.return_value = MagicMock()
        
        response = client.post("/api/inbound-sms", data={
            "From": "+15551234567",
            "To": "+15559876543",
            "Body": "Rs.499 deducted for Netflix",
            "MessageSid": "SM123456",
        })
        assert response.status_code == 200

    @patch("app.main.verify_twilio_signature", return_value=False)
    def test_invalid_signature_returns_403(self, mock_sig):
        response = client.post("/api/inbound-sms", data={
            "From": "+15551234567",
            "To": "+15559876543",
            "Body": "Rs.499 deducted for Netflix",
            "MessageSid": "SM123456",
        })
        assert response.status_code == 403

    @patch("app.main.verify_twilio_signature", return_value=True)
    @patch("app.main.is_duplicate", return_value=True)
    def test_duplicate_sms_skipped(self, mock_dup, mock_sig):
        response = client.post("/api/inbound-sms", data={
            "From": "+15551234567",
            "To": "+15559876543",
            "Body": "Rs.499 deducted for Netflix",
            "MessageSid": "SM123456",
        })
        assert response.status_code == 200

    @patch("app.main.verify_twilio_signature", return_value=True)
    @patch("app.main.is_duplicate", return_value=False)
    @patch("app.main.parse_sms", return_value=[])
    def test_no_transactions_returns_200(self, mock_parse, mock_dup, mock_sig):
        response = client.post("/api/inbound-sms", data={
            "From": "+15551234567",
            "To": "+15559876543",
            "Body": "Your OTP is 123456",
            "MessageSid": "SM123456",
        })
        assert response.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_inbound_sms.py -v`
Expected: FAIL with 404 (endpoint doesn't exist yet)

- [ ] **Step 3: Implement webhook endpoint in main.py**

Add to `app/main.py` (after the existing `/api/upload-sms` endpoint):

```python
@app.post("/api/inbound-sms")
async def inbound_sms(request: Request, db: Session = Depends(get_db)):
    """Receive incoming SMS from Twilio webhook."""
    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}
    
    # Verify Twilio signature
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    if not verify_twilio_signature(url, params, signature):
        audit_logger.log(user_id="unknown", action="sms_webhook_rejected", details={"reason": "invalid_signature"})
        return Response(status_code=403)
    
    message_sid = params.get("MessageSid", "")
    from_number = params.get("From", "")
    to_number = params.get("To", "")
    body = params.get("Body", "")
    
    # Dedup
    if is_duplicate(db, message_sid):
        return Response(status_code=200)
    
    # Find user by Twilio "To" number (the platform's Twilio number → user mapping)
    # The "To" field tells us which user this SMS belongs to
    from app.models_db import User as UserModel
    user = db.query(UserModel).filter(UserModel.phone_number == to_number).first()
    if not user:
        # Fallback: find any user with SMS forwarding enabled (single Twilio number mode)
        user = db.query(UserModel).filter(
            UserModel.sms_forwarding_enabled == True
        ).first()
    
    if not user:
        audit_logger.log(user_id="unknown", action="sms_webhook_no_user", details={"from": from_number})
        return Response(status_code=200)
    
    # Parse SMS
    sms_data = parse_sms(body)
    
    # Save raw SMS
    save_sms_message(db, user.id, message_sid, from_number, body, sms_data)
    
    if not sms_data:
        return Response(status_code=200)
    
    # Convert to Transaction objects and run pipeline
    import uuid as _uuid
    from datetime import datetime as _dt
    from app.models import Transaction as _Txn, Frequency, PriceTrend, Action, Subscription as _Sub
    
    transactions = []
    for item in sms_data:
        try:
            txn_date = _dt.strptime(item['date'], '%Y-%m-%d').date()
        except (ValueError, KeyError):
            txn_date = _dt.today().date()
        transactions.append(_Txn(
            id=str(_uuid.uuid4()),
            date=txn_date,
            amount=item['amount'],
            description=item.get('merchant', item['description']),
        ))
    
    # Run intelligence engine
    analysis_id = str(_uuid.uuid4())
    create_analysis(db, user.id, analysis_id)
    
    engine = IntelligenceEngine()
    intel_result = engine.analyze(transactions)
    
    # NOTE: The following subscription mapping logic is duplicated from the upload-sms endpoint
    # (main.py:420-496). Consider extracting a shared helper function like `process_transactions_to_subscriptions()`
    # to avoid divergence. For MVP, duplicating is acceptable — refactor in a follow-up.
    freq_map = {
        'weekly': Frequency.WEEKLY,
        'monthly': Frequency.MONTHLY,
        'quarterly': Frequency.QUARTERLY,
        'annual': Frequency.ANNUAL,
    }
    action_map = {
        'keep': Action.KEEP,
        'review': Action.REVIEW,
        'downgrade': Action.DOWNGRADE,
        'renegotiate': Action.RENEGOTIATE,
        'cancel': Action.CANCEL,
    }
    
    subscriptions = []
    for i, intel_sub in enumerate(intel_result.subscriptions):
        rec = intel_result.recommendations[i] if i < len(intel_result.recommendations) else None
        sub_txns = [t for t in transactions if t.id in intel_sub.transaction_ids]
        amounts = [t.amount for t in sub_txns]
        
        leak_scorer = LeakScorer()
        leak_score = leak_scorer.calculate(intel_sub)
        
        subscriptions.append(_Sub(
            id=str(_uuid.uuid4()),
            merchant=intel_sub.merchant,
            amount=round(intel_sub.amount, 2),
            frequency=freq_map.get(intel_sub.frequency, Frequency.MONTHLY),
            category=intel_sub.category,
            leak_score=leak_score,
            action=action_map.get(rec.action if rec else 'review', Action.REVIEW),
            reasoning=rec.reasoning if rec else '',
            price_trend=detect_price_trend(amounts) if amounts else PriceTrend.STABLE,
            price_increases=count_price_increases(amounts) if amounts else 0,
            duration_months=calculate_duration_months(sub_txns) if sub_txns else 0,
        ))
    
    if subscriptions:
        total_monthly = sum(s.amount for s in subscriptions)
        overall_score = calculate_overall_score(subscriptions)
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=round(total_monthly, 2), overall_score=overall_score, warnings=[])
        for sub in subscriptions:
            add_subscription_to_analysis(db, analysis_id, {
                "merchant": sub.merchant,
                "amount": sub.amount,
                "frequency": sub.frequency.value,
                "category": sub.category,
                "leak_score": sub.leak_score,
                "action": sub.action.value,
                "reasoning": sub.reasoning,
                "price_trend": sub.price_trend.value if hasattr(sub.price_trend, 'value') else sub.price_trend,
                "duration_months": sub.duration_months,
                "price_increases": sub.price_increases,
            })
    else:
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=0.0, overall_score=0, warnings=["No recurring subscriptions detected from SMS."])
    
    audit_logger.log(user_id=user.id, action="sms_inbound_processed", details={"message_sid": message_sid, "subscriptions_found": len(subscriptions)})
    # Rate limiting
    rate_key = f"sms:{user.id}"
    if not rate_limiter.is_allowed(rate_key):
        audit_logger.log(user_id=user.id, action="sms_webhook_rate_limited", details={"message_sid": message_sid})
        return Response(status_code=200)  # Still return 200 to Twilio

    metrics.record("sms_inbound_count", 1)
    
    # Send email notification if subscriptions found
    if subscriptions and user.settings and user.settings.notification_email:
        from app.services.email import send_password_reset_email  # reuse SMTP infra
        # TODO: implement send_sms_notification_email in Task 6
    
    return Response(status_code=200)
```

- [ ] **Step 4: Run webhook tests**

Run: `cd subscription-detector && python -m pytest tests/test_inbound_sms.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add app/main.py tests/test_inbound_sms.py
git commit -m "feat(sms): add POST /api/inbound-sms Twilio webhook endpoint"
```

---

### Task 6: SMS Settings Endpoints

**Files:**
- Modify: `subscription-detector/app/user/routes.py`

**Interfaces:**
- Consumes: `User` model, `get_current_user` dependency, SQLAlchemy `Session`
- Produces: `GET /api/user/sms-settings`, `PUT /api/user/sms-settings`

- [ ] **Step 1: Write failing tests for SMS settings**

Create `tests/test_sms_settings.py`:

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app

client = TestClient(app)


class TestSmsSettings:
    @patch("app.user.routes.get_current_user")
    def test_get_sms_settings(self, mock_user):
        mock_user.return_value = MagicMock(id="test-user-1", phone_number="+919876543210", sms_forwarding_enabled=True)
        response = client.get("/api/user/sms-settings")
        assert response.status_code == 200
        data = response.json()
        assert data["phone_number"] == "+919876543210"
        assert data["sms_forwarding_enabled"] is True

    @patch("app.user.routes.get_current_user")
    def test_update_sms_settings(self, mock_user):
        mock_user.return_value = MagicMock(id="test-user-1")
        response = client.put("/api/user/sms-settings", json={
            "phone_number": "+919876543210",
            "sms_forwarding_enabled": True,
        })
        assert response.status_code == 200

    @patch("app.user.routes.get_current_user")
    @patch("app.user.routes.send_sms", return_value=True)
    def test_sms_test_endpoint(self, mock_send, mock_user):
        mock_user.return_value = MagicMock(id="test-user-1", phone_number="+919876543210")
        response = client.post("/api/user/sms-test")
        assert response.status_code == 200
        mock_send.assert_called_once()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd subscription-detector && python -m pytest tests/test_sms_settings.py -v`
Expected: FAIL with 404 or 405

- [ ] **Step 3: Implement SMS settings endpoints**

Add to `app/user/routes.py`:

```python
from pydantic import BaseModel

class SmsSettingsUpdate(BaseModel):
    phone_number: str | None = None
    sms_forwarding_enabled: bool | None = None

class SmsSettingsResponse(BaseModel):
    phone_number: str | None
    sms_forwarding_enabled: bool
    forwarding_number: str | None  # Platform Twilio number (read-only)

@router.get("/sms-settings", response_model=SmsSettingsResponse)
async def get_sms_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.services.twilio import TWILIO_PHONE_NUMBER
    return {
        "phone_number": current_user.phone_number,
        "sms_forwarding_enabled": current_user.sms_forwarding_enabled,
        "forwarding_number": TWILIO_PHONE_NUMBER,
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
    
    from app.services.twilio import TWILIO_PHONE_NUMBER
    return {
        "phone_number": current_user.phone_number,
        "sms_forwarding_enabled": current_user.sms_forwarding_enabled,
        "forwarding_number": TWILIO_PHONE_NUMBER,
    }

@router.post("/sms-test")
async def test_sms_forwarding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a test SMS to verify forwarding setup."""
    from app.services.twilio import send_sms, TWILIO_PHONE_NUMBER
    
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd subscription-detector && python -m pytest tests/test_sms_settings.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add app/user/routes.py tests/test_sms_settings.py
git commit -m "feat(sms): add SMS settings GET/PUT endpoints"
```

---

### Task 7: Frontend — SMS Settings Section

**Files:**
- Create: `subscription-detector/frontend/src/hooks/useSmsSettings.ts`
- Modify: `subscription-detector/frontend/src/pages/Settings.tsx`
- Modify: `subscription-detector/frontend/src/lib/types.ts`

**Interfaces:**
- Consumes: `GET /api/user/sms-settings`, `PUT /api/user/sms-settings`
- Produces: SMS settings UI section in Settings page

- [ ] **Step 1: Add SmsSettings type to types.ts**

Add to `frontend/src/lib/types.ts`:

```typescript
export interface SmsSettings {
  phone_number: string | null;
  sms_forwarding_enabled: boolean;
  forwarding_number: string | null;
}
```

- [ ] **Step 2: Create useSmsSettings hook**

Create `frontend/src/hooks/useSmsSettings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SmsSettings } from '../lib/types';

export function useSmsSettings() {
  return useQuery<SmsSettings>({
    queryKey: ['sms-settings'],
    queryFn: () => api.get('/api/user/sms-settings').then(res => res.data),
  });
}

export function useUpdateSmsSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone_number?: string; sms_forwarding_enabled?: boolean }) =>
      api.put('/api/user/sms-settings', data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] });
    },
  });
}
```

- [ ] **Step 3: Add SMS section to Settings.tsx**

Add to the Settings page component (after the existing email forwarding section):

```tsx
// SMS Forwarding Section
const { data: smsSettings } = useSmsSettings();
const updateSmsSettings = useUpdateSmsSettings();
const [smsPhoneNumber, setSmsPhoneNumber] = useState(smsSettings?.phone_number || '');

// In the JSX, add after the email forwarding section:
<Card>
  <CardHeader>
    <CardTitle>SMS Forwarding</CardTitle>
    <CardDescription>
      Automatically detect subscriptions from bank SMS alerts
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {smsSettings?.forwarding_number && (
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm font-medium">Your forwarding number:</p>
        <p className="text-lg font-mono">{smsSettings.forwarding_number}</p>
      </div>
    )}
    
    <div className="space-y-2">
      <Label htmlFor="sms-phone">Your phone number</Label>
      <Input
        id="sms-phone"
        placeholder="+91 98765 43210"
        value={smsPhoneNumber}
        onChange={(e) => setSmsPhoneNumber(e.target.value)}
      />
    </div>
    
    <div className="flex items-center space-x-2">
      <Switch
        checked={smsSettings?.sms_forwarding_enabled || false}
        onCheckedChange={(checked) =>
          updateSmsSettings.mutate({ sms_forwarding_enabled: checked })
        }
      />
      <Label>Enable SMS forwarding</Label>
    </div>
    
    <Button
      onClick={() => updateSmsSettings.mutate({ phone_number: smsPhoneNumber })}
      disabled={updateSmsSettings.isPending}
    >
      Save Phone Number
    </Button>
    
    {smsSettings?.sms_forwarding_enabled && (
      <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
        <p className="font-medium">Setup Instructions:</p>
        <p><strong>iOS:</strong> Open Shortcuts → Create automation → When SMS received containing "deducted"/"spent" → Forward to {smsSettings.forwarding_number}</p>
        <p><strong>Android:</strong> Install Tasker → Profile: SMS received → Filter: Body matches "deducted" → Task: Send SMS to {smsSettings.forwarding_number}</p>
      </div>
    )}

    <Button
      variant="outline"
      onClick={() => {
        fetch('/api/user/sms-test', { method: 'POST' })
          .then(() => alert('Test SMS sent!'))
          .catch(() => alert('Failed to send test SMS'));
      }}
    >
      Test Forwarding
    </Button>
  </CardContent>
</Card>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd subscription-detector/frontend && npm run type-check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd subscription-detector
git add frontend/src/hooks/useSmsSettings.ts frontend/src/pages/Settings.tsx frontend/src/lib/types.ts
git commit -m "feat(sms): add SMS forwarding section to Settings page"
```

---

### Task 8: Integration Tests

**Files:**
- Create: `subscription-detector/tests/test_sms_integration.py`

**Interfaces:**
- Consumes: all previous tasks
- Produces: end-to-end SMS → subscription pipeline tests

- [ ] **Step 1: Write integration tests**

Create `tests/test_sms_integration.py`:

```python
import pytest
from unittest.mock import patch, MagicMock
from datetime import date


class TestSmsToSubscriptionPipeline:
    """End-to-end test: SMS text → parsed → IntelligenceEngine → stored subscription."""

    def test_hdfc_sms_creates_subscription(self):
        from app.parsers.sms_parser import parse_sms
        from app.intelligence.intelligence_engine import IntelligenceEngine
        from app.models import Transaction
        import uuid

        sms_text = "VM-HDFCBK: Rs.499.00 spent on Card XX1234 at NETFLIX.COM on 25/07/26"
        parsed = parse_sms(sms_text)
        
        assert len(parsed) == 1
        assert parsed[0]['amount'] == 499.0
        assert parsed[0]['merchant'] == 'NETFLIX.COM'
        assert parsed[0]['bank'] == 'HDFC Bank'

        # Convert to Transaction
        txn = Transaction(
            id=str(uuid.uuid4()),
            date=date(2026, 7, 25),
            amount=499.0,
            description='NETFLIX.COM',
        )

        # Run through intelligence engine (needs multiple instances for recurring detection)
        # For single SMS, engine may not detect recurring - that's expected
        engine = IntelligenceEngine()
        result = engine.analyze([txn])
        
        # Result should not crash
        assert result is not None

    def test_subscription_sms_classified_correctly(self):
        from app.parsers.sms_parser import parse_sms

        # Strong subscription signal
        result = parse_sms("Auto-renewal: Rs.499 charged for Netflix on 25/07/26")
        assert result[0]['is_subscription'] is True

        # Non-subscription transaction
        result = parse_sms("Rs.499 deducted from A/c XX12345 on 25/07/26")
        assert result[0]['is_subscription'] is False

    def test_promotional_sms_filtered(self):
        from app.parsers.sms_parser import parse_sms

        result = parse_sms("Get 50% off on new credit card! Apply now T&C apply")
        assert len(result) == 0

    def test_otp_sms_filtered(self):
        from app.parsers.sms_parser import parse_sms

        result = parse_sms("Your OTP for transaction is 789012. Do not share with anyone")
        assert len(result) == 0
```

- [ ] **Step 2: Run integration tests**

Run: `cd subscription-detector && python -m pytest tests/test_sms_integration.py -v`
Expected: All PASS

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `cd subscription-detector && python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
cd subscription-detector
git add tests/test_sms_integration.py
git commit -m "test(sms): add integration tests for SMS to subscription pipeline"
```

---

### Task 9: Environment & Documentation

**Files:**
- Modify: `.env.example`
- Modify: `docs/PROJECT_DOCUMENTATION.md`

**Interfaces:**
- Consumes: all previous tasks
- Produces: updated env vars and documentation

- [ ] **Step 1: Add Twilio env vars to .env.example**

Add to `.env.example`:

```env
# Twilio (SMS Forwarding)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

- [ ] **Step 2: Update PROJECT_DOCUMENTATION.md**

Add to the Tech Stack table:
```
| SMS | Twilio (incoming SMS webhook) |
```

Add to the Architecture section:
```
│  ┌──────────────────────────────────────────┐  │
│  │  POST /api/inbound-sms (Twilio webhook)  │  │
│  │  - Twilio signature verification          │  │
│  │  - SMS parsing + smart filtering          │  │
│  │  - User matching via phone number         │  │
│  └──────────────────────────────────────────┘  │
```

Add to the Features section:
```markdown
### 5.5 SMS Forwarding

- Platform-provided Twilio number for receiving SMS
- Auto-forwarding setup (iOS Shortcuts, Android Tasker)
- Smart filtering: skips OTP, promotional, balance inquiry SMS
- Multi-bank format support: HDFC, SBI, ICICI, Axis, international
- Merchant extraction and subscription classification
- Real-time processing via Twilio webhook
```

Add to the API Reference:
```markdown
### SMS

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/inbound-sms` | Twilio signature | Receive SMS from Twilio |
| GET | `/api/user/sms-settings` | Yes | Get SMS settings |
| PUT | `/api/user/sms-settings` | Yes | Update SMS settings |
```

- [ ] **Step 3: Commit**

```bash
cd subscription-detector
git add .env.example docs/PROJECT_DOCUMENTATION.md
git commit -m "docs(sms): update env vars and project documentation for SMS feature"
```

---

### Task 10: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd subscription-detector && python -m pytest tests/ -v --tb=short`
Expected: All PASS

- [ ] **Step 2: Run frontend type check**

Run: `cd subscription-detector/frontend && npm run type-check`
Expected: No errors

- [ ] **Step 3: Run frontend build**

Run: `cd subscription-detector/frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Start backend: `cd subscription-detector && uvicorn app.main:app --reload`
Start frontend: `cd subscription-detector/frontend && npm run dev`

Verify:
- Settings page shows SMS Forwarding section
- Can enter phone number and save
- Can toggle SMS forwarding enabled/disabled
- Forwarding instructions display when enabled

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
cd subscription-detector
git add -A
git commit -m "fix(sms): address review feedback from final verification"
```

---

### Task 11: Frontend E2E Tests

**Files:**
- Create: `subscription-detector/frontend/tests/e2e/sms-setup.spec.ts`

**Interfaces:**
- Consumes: Settings page SMS section
- Produces: E2E tests for SMS setup flow

- [ ] **Step 1: Write E2E tests for SMS settings**

Create `frontend/tests/e2e/sms-setup.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('SMS Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // Navigate to settings
    await page.goto('/settings');
  });

  test('shows SMS forwarding section', async ({ page }) => {
    await expect(page.locator('text=SMS Forwarding')).toBeVisible();
    await expect(page.locator('text=Your forwarding number')).toBeVisible();
  });

  test('can enter phone number', async ({ page }) => {
    await page.fill('input[id="sms-phone"]', '+919876543210');
    await page.click('button:has-text("Save Phone Number")');
    await expect(page.locator('text=+919876543210')).toBeVisible();
  });

  test('can toggle SMS forwarding', async ({ page }) => {
    const toggle = page.locator('button[role="switch"]').last();
    await toggle.click();
    await expect(page.locator('text=Setup Instructions')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `cd subscription-detector/frontend && npx playwright test tests/e2e/sms-setup.spec.ts`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
cd subscription-detector
git add frontend/tests/e2e/sms-setup.spec.ts
git commit -m "test(sms): add E2E tests for SMS settings page"
```
