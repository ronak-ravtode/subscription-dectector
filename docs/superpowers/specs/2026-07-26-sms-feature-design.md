# SMS Feature Design Spec

**Date:** 2026-07-26
**Status:** Approved
**Scope:** Real-time SMS transaction ingestion via Twilio

---

## 1. Overview

Add SMS as a third data ingestion channel alongside PDF upload and email forwarding. Users configure auto-forwarding on their phones to a platform-provided Twilio number. SMS arrives in real-time, gets parsed, and flows through the existing IntelligenceEngine pipeline.

## 2. Architecture

```
User's Phone (auto-forward)
       │
       ▼
  Twilio Platform
       │
       ▼ POST /api/inbound-sms
  ┌─────────────────────────────────┐
  │  Twilio Webhook Endpoint        │
  │  - Verify Twilio signature      │
  │  - Parse incoming SMS body       │
  │  - Identify user (To number)    │
  └────────────┬────────────────────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │  Enhanced SMS Parser            │
  │  - Extract: date, amount,       │
  │    merchant, description        │
  │  - Smart filtering (skip promo) │
  │  - Multi-bank format support    │
  └────────────┬────────────────────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │  IntelligenceEngine (existing)  │
  │  - Recurring detection          │
  │  - Subscription scoring         │
  │  - Action recommendations       │
  └────────────┬────────────────────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │  Store in DB + Email notification│
  │  (reuse existing email service) │
  └─────────────────────────────────┘
```

### Key decisions

- **User identification:** Each user is assigned the platform's Twilio number. When SMS arrives, the `To` field identifies which user it belongs to (1:1 mapping stored in DB).
- **Real-time only:** No background scanning for MVP. Each SMS triggers immediate analysis.
- **Reuses existing pipeline:** Same `IntelligenceEngine` → `LeakScorer` → `Subscription` flow as PDF and email.
- **No outbound SMS:** Notifications are email-only (existing infrastructure).

## 3. Twilio Webhook Endpoint

**Endpoint:** `POST /api/inbound-sms`

### Request handling

1. Twilio sends form-encoded POST with fields: `From`, `To`, `Body`, `MessageSid`, `NumMedia`, etc.
2. Verify request signature using `X-Twilio-Signature` header (HMAC-SHA1)
3. Extract user: match `To` number to a registered user in DB
4. Dedup by `MessageSid` (check `sms_messages` table)
5. Parse SMS body through enhanced parser
6. If valid transactions found → run through IntelligenceEngine → store results
7. Return Twilio-compatible response (empty 200 OK)

### Twilio signature verification

```python
# Similar pattern to existing webhook.py but using SHA1 (Twilio's spec)
import hmac
import hashlib
import base64

def verify_twilio_signature(url: str, params: dict, signature: str) -> bool:
    twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    # Build validation URL: full URL + sorted params
    # HMAC-SHA1 → base64 → compare with X-Twilio-Signature
```

### Environment variables

```env
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+15551234567
```

## 4. Enhanced SMS Parser

### Current gaps in `sms_parser.py`

- No merchant extraction (only `description`)
- No `is_subscription` classification
- No multi-bank format support
- No sender/phone number metadata

### New capabilities

**1. Merchant extraction**

Regex patterns for common Indian bank SMS formats:
- `for <MERCHANT>` / `to <MERCHANT>` / `at <MERCHANT>`
- Sender prefix cleaning: `VM-HDFCBK` → `HDFC Bank`
- Fallback: cleaned description text

**2. Subscription classification (two-tier)**

- **Strong signals** (alone sufficient): "auto-renew", "subscription renewed", "monthly plan", "annual plan", "recurring payment"
- **Weak signals** (need billing context): amount + merchant + "deducted"/"charged"/"billed"/"debited"

**3. Multi-bank SMS format support**

| Bank | Format | Example |
|------|--------|---------|
| HDFC | `INR 499.00 spent on HDFC Bank Card XX1234 at NETFLIX` | Debit alert |
| SBI | `Dear Customer, your A/c X12345 is debited for INR 499 on 25/07/26` | Debit notification |
| ICICI | `ICICI Bank Acct XX1234 debited INR 499.00 on 25 Jul by NEFT NETFLIX INDIA` | Transaction alert |
| Axis | `Axis Bank -- Rs.499.00 spent via Card XX1234 on 25-Jul-26 at NETFLIX.COM` | Spend alert |
| International | `$14.99 transaction on VISA ****1234 at SPOTIFY USA` | Generic |

**4. Smart filtering**

| Category | Action | Examples |
|----------|--------|---------|
| Transaction alert | **Parse** | "Rs.499 deducted", "INR 14.99 spent" |
| Balance inquiry | **Skip** | "Your balance is INR 12000" |
| Promotional | **Skip** | "Get 50% off on credit card" |
| OTP/Verification | **Skip** | "Your OTP is 123456" |
| Personal P2P | **Skip** | "Rs.500 received from Rahul" |

### Updated parser output format

```python
{
    'date': '2026-07-25',          # ISO date string
    'amount': 499.0,               # float
    'description': 'NETFLIX',      # cleaned text
    'merchant': 'NETFLIX',         # NEW: extracted merchant
    'is_subscription': True,       # NEW: classification
    'sender': 'VM-HDFCBK',        # NEW: SMS sender ID
    'bank': 'HDFC Bank',          # NEW: resolved bank name
    'raw_text': '...'             # NEW: original SMS
}
```

## 5. Data Model Changes

### New columns on `users` table

```sql
ALTER TABLE users ADD COLUMN phone_number VARCHAR;
ALTER TABLE users ADD COLUMN sms_forwarding_enabled BOOLEAN DEFAULT FALSE;
```

### New `sms_messages` table

```sql
CREATE TABLE sms_messages (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id),
    message_sid VARCHAR UNIQUE NOT NULL,  -- Twilio's MessageSid
    sender VARCHAR,
    body TEXT NOT NULL,
    parsed_transactions JSON DEFAULT '[]',
    is_processed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Pydantic models

```python
class SmsMessage(BaseModel):
    id: str
    user_id: str
    message_sid: str
    sender: str | None
    body: str
    parsed_transactions: list[dict]
    is_processed: bool
    created_at: datetime

class SmsSettings(BaseModel):
    phone_number: str | None
    sms_forwarding_enabled: bool
    forwarding_number: str | None  # Platform Twilio number (read-only)
```

## 6. User Onboarding & Settings

### Settings page additions

New "SMS Forwarding" section on `/settings`:

- Display platform Twilio number (read-only)
- Phone number input field
- Status indicator (Active/Inactive)
- Auto-forwarding setup instructions (iOS Shortcuts, Android Tasker)
- "Test Forwarding" button

### API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/user/sms-settings` | Yes | Get SMS settings |
| PUT | `/api/user/sms-settings` | Yes | Update phone number, enable/disable |
| POST | `/api/user/sms-test` | Yes | Send test SMS via Twilio |

### User flow

1. User visits Settings → SMS Forwarding
2. Enters their phone number
3. System stores phone number + enables SMS forwarding
4. User sets up auto-forwarding on phone (iOS/Android instructions provided)
5. SMS starts flowing in real-time

## 7. Error Handling

| Scenario | Handling |
|----------|----------|
| Twilio signature invalid | Return 403, log warning, skip |
| Unknown `To` number | Return 200 OK, log unregistered number |
| SMS parsing fails | Skip silently, return 200 OK |
| Duplicate SMS (same MessageSid) | Skip, return 200 OK |
| User deleted | Log orphan SMS, return 200 OK |
| IntelligenceEngine fails | Log error, return 200 OK |
| Rate limiting | Max 100 SMS/hour per user |

**Critical:** Always return 200 OK to Twilio. Non-200 causes retries.

## 8. Testing Strategy

### Backend tests

| Test file | Coverage |
|-----------|----------|
| `tests/test_sms_parser.py` (enhance) | Multi-bank formats, merchant extraction, classification, filtering |
| `tests/test_inbound_sms.py` (new) | Webhook verification, user matching, dedup, errors |
| `tests/test_sms_integration.py` (new) | Full pipeline: SMS → parser → IntelligenceEngine → stored subscription |

### Test cases

**Parser tests:**
- HDFC/SBI/ICICI/Axis format parsing
- International format parsing
- Merchant extraction from various formats
- Sender prefix cleaning
- Subscription classification (strong + weak signals)
- Smart filtering (transaction vs promo vs OTP)
- Edge cases: empty body, no amount, multiple transactions, Unicode (₹)

**Webhook tests:**
- Valid Twilio signature → processed
- Invalid signature → 403
- Unknown user → 200 OK, logged
- Duplicate MessageSid → skipped
- Rate limit exceeded → 429

**Integration tests:**
- Full flow: SMS → subscription stored in DB
- Email notification sent on detection
- Multiple SMS → recurring pattern detected

### Frontend tests

| Test file | Coverage |
|-----------|----------|
| `tests/e2e/sms-setup.spec.ts` (new) | Settings page SMS section, phone number save, status display |

## 9. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `app/parsers/sms_parser.py` | **Enhance** | Add merchant extraction, classification, multi-bank support, smart filtering |
| `app/main.py` | **Add** | `POST /api/inbound-sms` webhook endpoint |
| `app/models_db.py` | **Add** | `SmsMessage` model, new columns on `users` |
| `app/repositories/sms.py` | **New** | SMS message CRUD, dedup logic |
| `app/services/twilio.py` | **New** | Twilio signature verification, SMS sending |
| `app/user/routes.py` | **Add** | SMS settings endpoints |
| `frontend/src/pages/Settings.tsx` | **Add** | SMS forwarding section |
| `frontend/src/hooks/useSmsSettings.ts` | **New** | SMS settings API hooks |
| `tests/test_sms_parser.py` | **Enhance** | Multi-bank tests, classification tests |
| `tests/test_inbound_sms.py` | **New** | Webhook tests |
| `tests/test_sms_integration.py` | **New** | Integration tests |
| `.env.example` | **Add** | Twilio env vars |

## 10. Out of Scope (v2)

- Background SMS scanning (periodic re-analysis)
- Batch SMS import
- Outbound SMS notifications
- Multi-Twilio-number support
- SMS from non-transaction sources (WhatsApp, Telegram)
