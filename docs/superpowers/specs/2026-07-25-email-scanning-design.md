# Email Scanning Feature - Design Specification

**Date:** 2026-07-25  
**Status:** Approved  
**Purpose:** Automatically detect recurring subscriptions from user's Gmail inbox

---

## 1. Overview

### Problem
Users have subscription emails scattered across their inbox. Manually tracking all subscriptions is tedious and error-prone.

### Solution
Connect to user's Gmail via IMAP, scan for subscription-related emails, extract transaction data, and detect recurring patterns automatically.

### Goals
- Detect subscriptions from email bodies (receipts, payment confirmations, billing notifications)
- Run daily background scans
- Show results on dashboard
- Simple, secure, hackathon-ready

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EMAIL SCANNING ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND                               │   │
│  │                                                           │   │
│  │  EmailConnect Page                                        │   │
│  │  - Email input field                                      │   │
│  │  - App Password input field                               │   │
│  │  - "Connect Gmail" button                                 │   │
│  │  - Connection status indicator                            │   │
│  │                                                           │   │
│  │  Dashboard                                                 │   │
│  │  - "Last scan: 2 hours ago"                               │   │
│  │  - "X subscriptions found via email"                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FASTAPI BACKEND                         │   │
│  │                                                           │   │
│  │  POST /api/email/connect                                  │   │
│  │  GET /api/email/status                                    │   │
│  │  POST /api/email/scan-now                                 │   │
│  │  DELETE /api/email/disconnect                             │   │
│  │                                                           │   │
│  │  Daily Cron Job (APScheduler)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SERVICES                               │   │
│  │                                                           │   │
│  │  imap_client.py      - IMAP connection + email search     │   │
│  │  email_scanner.py    - Parse emails + extract transactions │   │
│  │  background_scanner.py - Daily cron orchestrator          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATABASE                                │   │
│  │                                                           │   │
│  │  email_credentials    - Encrypted IMAP credentials        │   │
│  │  email_scan_results   - Scanned emails + transactions     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Components

### 3.1 Database Models

```python
# app/models_db.py - Add new tables

class EmailCredentials(Base):
    __tablename__ = "email_credentials"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    email = Column(String, nullable=False)
    imap_server = Column(String, default="imap.gmail.com")
    encrypted_password = Column(String, nullable=False)  # Fernet encrypted
    last_scan = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")

class EmailScanResult(Base):
    __tablename__ = "email_scan_results"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message_id = Column(String, nullable=False)  # IMAP message ID
    subject = Column(String, nullable=True)
    from_email = Column(String, nullable=True)
    received_date = Column(DateTime, nullable=True)
    transactions_json = Column(JSON, default=[])  # Extracted transactions
    is_recurring = Column(Boolean, default=False)
    merchant_detected = Column(String, nullable=True)
    amount_detected = Column(Float, nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
```

### 3.2 API Endpoints

```python
# app/user/routes.py - Add email endpoints

@router.post("/api/email/connect")
async def connect_email(
    request: EmailConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect Gmail account via IMAP."""
    # 1. Validate credentials by testing IMAP connection
    # 2. Encrypt password with Fernet
    # 3. Store in email_credentials table
    # 4. Return success status

@router.get("/api/email/status")
async def email_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email connection status."""
    # Return: connected, last_scan, emails_scanned_count

@router.post("/api/email/scan-now")
async def scan_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger immediate email scan."""
    # 1. Get user's email credentials
    # 2. Connect to IMAP
    # 3. Search for subscription emails
    # 4. Parse and extract transactions
    # 5. Store results
    # 6. Return scan summary

@router.delete("/api/email/disconnect")
async def disconnect_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect email account."""
    # Delete credentials from database
```

### 3.3 IMAP Client Service

```python
# app/services/imap_client.py

from imap_tools import MailBox, OR
from typing import List, Generator

IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993

SUBSCRIPTION_KEYWORDS = [
    'receipt', 'payment', 'subscription', 'invoice', 
    'billing', 'renewal', 'charge', 'receipt from'
]

KNOWN_SENDERS = [
    'netflix.com', 'spotify.com', 'amazon.com', 'apple.com',
    'microsoft.com', 'adobe.com', 'hulu.com', 'disneyplus.com',
    'hbo.com', 'youtube.com', 'dropbox.com', 'zoom.us'
]

def connect_gmail(email: str, app_password: str) -> MailBox:
    """Connect to Gmail IMAP server."""
    mailbox = MailBox(IMAP_SERVER, IMAP_PORT)
    mailbox.login(email, app_password)
    return mailbox

def search_subscription_emails(
    mailbox: MailBox, 
    days_back: int = 7,
    limit: int = 100
) -> Generator:
    """Search for subscription-related emails."""
    # Build search criteria
    criteria = OR(
        *[f'SUBJECT "{kw}"' for kw in SUBSCRIPTION_KEYWORDS],
        *[f'FROM "{sender}"' for sender in KNOWN_SENDERS]
    )
    
    return mailbox.fetch(criteria, limit=limit)

def test_connection(email: str, app_password: str) -> bool:
    """Test IMAP connection with credentials."""
    try:
        mailbox = connect_gmail(email, app_password)
        mailbox.logout()
        return True
    except Exception:
        return False
```

### 3.4 Email Scanner Service

```python
# app/services/email_scanner.py

from app.parsers.email_parser import extract_transactions_from_email
from app.detectors.recurring_detector import detect_recurring
from app.services.imap_client import connect_gmail, search_subscription_emails

def scan_user_emails(user_id: str, email: str, app_password: str, db: Session) -> dict:
    """Scan user's Gmail for subscription emails."""
    results = {
        "emails_scanned": 0,
        "transactions_found": 0,
        "subscriptions_detected": 0
    }
    
    # Connect to Gmail
    mailbox = connect_gmail(email, app_password)
    
    # Search for subscription emails
    emails = search_subscription_emails(mailbox, days_back=30)
    
    for msg in emails:
        results["emails_scanned"] += 1
        
        # Check if already scanned
        if is_already_scanned(user_id, msg.uid, db):
            continue
        
        # Extract transactions from email body
        email_text = msg.text or msg.html
        transactions = extract_transactions_from_email(email_text)
        
        if transactions:
            results["transactions_found"] += len(transactions)
            
            # Store scan result
            store_scan_result(
                user_id=user_id,
                message_id=msg.uid,
                subject=msg.subject,
                from_email=msg.from_,
                transactions=transactions,
                db=db
            )
    
    mailbox.logout()
    
    # Detect recurring patterns
    results["subscriptions_detected"] = detect_new_subscriptions(user_id, db)
    
    return results
```

### 3.5 Background Scheduler

```python
# app/services/background_scanner.py

from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.models_db import EmailCredentials
from app.services.email_scanner import scan_user_emails

scheduler = BackgroundScheduler()

def start_scheduler():
    """Start the background scheduler."""
    scheduler.add_job(daily_email_scan, 'cron', hour=2, minute=0)
    scheduler.start()

@scheduler.scheduled_job('cron', hour=2, minute=0)
def daily_email_scan():
    """Daily scan of all connected inboxes."""
    db = SessionLocal()
    try:
        # Get all active email credentials
        credentials = db.query(EmailCredentials).filter(
            EmailCredentials.is_active == True
        ).all()
        
        for cred in credentials:
            try:
                scan_user_emails(
                    user_id=cred.user_id,
                    email=cred.email,
                    app_password=decrypt_password(cred.encrypted_password),
                    db=db
                )
                # Update last scan time
                cred.last_scan = datetime.utcnow()
                db.commit()
            except Exception as e:
                print(f"Scan failed for {cred.user_id}: {e}")
    finally:
        db.close()
```

---

## 4. Frontend Components

### 4.1 Email Connect Page

```tsx
// frontend/src/pages/EmailConnect.tsx

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function EmailConnect() {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  
  // Get connection status
  const { data: status } = useQuery({
    queryKey: ['email-status'],
    queryFn: () => api.get('/api/email/status').then(r => r.data)
  });
  
  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (data) => api.post('/api/email/connect', data),
    onSuccess: () => {
      // Show success, refresh status
    }
  });
  
  // Scan now mutation
  const scanMutation = useMutation({
    mutationFn: () => api.post('/api/email/scan-now'),
    onSuccess: (data) => {
      // Show scan results
    }
  });
  
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Connect Gmail</h1>
      
      {!status?.connected ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          connectMutation.mutate({ email, app_password: appPassword });
        }}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Gmail Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="you@gmail.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                App Password
              </label>
              <input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="xxxx xxxx xxxx xxxx"
              />
              <p className="text-sm text-gray-500 mt-1">
                Generate at Google Account → Security → App Passwords
              </p>
            </div>
            
            <button
              type="submit"
              disabled={connectMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              {connectMutation.isPending ? 'Connecting...' : 'Connect Gmail'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800">
              ✓ Connected to {status.email}
            </p>
            <p className="text-sm text-green-600 mt-1">
              Last scan: {status.last_scan || 'Never'}
            </p>
          </div>
          
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {scanMutation.isPending ? 'Scanning...' : 'Scan Now'}
          </button>
          
          {scanMutation.data && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-blue-800">
                Scan complete: {scanMutation.data.emails_scanned} emails scanned, 
                {scanMutation.data.subscriptions_detected} subscriptions found
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Setup Instructions:</h3>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Go to Google Account → Security</li>
          <li>2. Enable 2-Step Verification</li>
          <li>3. Go to App Passwords</li>
          <li>4. Generate password for "Mail"</li>
          <li>5. Copy and paste above</li>
        </ol>
      </div>
    </div>
  );
}
```

### 4.2 Dashboard Integration

```tsx
// Add to Dashboard.tsx

const { data: emailStatus } = useQuery({
  queryKey: ['email-status'],
  queryFn: () => api.get('/api/email/status').then(r => r.data)
});

// In dashboard summary cards:
{emailStatus?.connected && (
  <SummaryCard
    title="Email Scanning"
    value={`${emailStatus.emails_scanned} emails`}
    subtitle={`Last scan: ${emailStatus.last_scan || 'Never'}`}
    icon={<MailIcon />}
  />
)}
```

---

## 5. Security

### 5.1 Password Encryption

```python
# app/services/encryption.py

from cryptography.fernet import Fernet
import os

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())

def encrypt_password(password: str) -> str:
    """Encrypt password using Fernet."""
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted: str) -> str:
    """Decrypt password using Fernet."""
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted.encode()).decode()
```

### 5.2 Security Rules

| Rule | Implementation |
|------|----------------|
| Passwords never logged | No print/log of credentials |
| HTTPS only | Production must use HTTPS |
| Rate limiting | Max 1 scan per hour per user |
| Credential isolation | Users only see their own credentials |
| Secure storage | Passwords encrypted at rest |

---

## 6. Email Search Patterns

### 6.1 Subject Keywords

```
receipt, payment, subscription, invoice, billing, 
renewal, charge, order confirmation, purchase
```

### 6.2 Known Senders

```
netflix.com, spotify.com, amazon.com, apple.com,
microsoft.com, adobe.com, hulu.com, disneyplus.com,
hbo.com, youtube.com, dropbox.com, zoom.us
```

### 6.3 Gmail Search Syntax

```python
# Combined search query
'(SUBJECT "receipt" OR SUBJECT "payment" OR SUBJECT "subscription" 
OR SUBJECT "invoice" OR SUBJECT "billing" OR SUBJECT "renewal" 
OR SUBJECT "charge" OR FROM "netflix.com" OR FROM "spotify.com" 
OR FROM "amazon.com" OR FROM "apple.com")'
```

---

## 7. Testing

### 7.1 Unit Tests

| Test | File | Purpose |
|------|------|---------|
| `test_imap_client.py` | Tests IMAP connection, search |
| `test_email_scanner.py` | Tests email parsing, transaction extraction |
| `test_encryption.py` | Tests password encrypt/decrypt |
| `test_background_scanner.py` | Tests cron job execution |

### 7.2 Integration Tests

| Test | Purpose |
|------|---------|
| `test_email_connect_flow` | Test full connect → scan → results flow |
| `test_daily_scan` | Test background job with mock IMAP |

---

## 8. Dependencies

### 8.1 New Python Packages

```
imap-tools==1.14.0      # IMAP client
cryptography==44.0.0    # Password encryption
apscheduler==3.10.4     # Background job scheduler
```

### 8.2 Frontend Dependencies

No new dependencies needed.

---

## 9. Environment Variables

```env
# .env additions

# Email Encryption
ENCRYPTION_KEY=your-fernet-key-here

# Scan Settings
EMAIL_SCAN_HOUR=2
EMAIL_SCAN_MINUTE=0
EMAIL_SCAN_LIMIT=100
```

---

## 10. Implementation Order

| Phase | Task | Time |
|-------|------|------|
| 1 | Database models | 15 min |
| 2 | IMAP client service | 30 min |
| 3 | Email scanner service | 45 min |
| 4 | API endpoints | 30 min |
| 5 | Frontend EmailConnect page | 45 min |
| 6 | Dashboard integration | 15 min |
| 7 | Background scheduler | 20 min |
| 8 | Testing | 30 min |
| **Total** | | **~4 hours** |

---

## 11. Success Criteria

- [ ] User can connect Gmail via App Password
- [ ] Credentials are encrypted and stored securely
- [ ] Manual scan works and finds subscription emails
- [ ] Daily background scan runs automatically
- [ ] Dashboard shows email scanning status
- [ ] Transactions are extracted from email bodies
- [ ] Recurring patterns are detected

---

## 12. Future Enhancements (Post-Hackathon)

- [ ] Gmail API OAuth (for production)
- [ ] Outlook/Yahoo support
- [ ] Real-time push notifications
- [ ] Email attachment parsing (PDF statements)
- [ ] Multi-provider support
- [ ] Batch processing optimization

---

**Document maintained by:** Development Team  
**Last updated:** 2026-07-25
