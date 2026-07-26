# Email Scanning Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Gmail IMAP-based email scanning to automatically detect recurring subscriptions from user email inboxes.

**Architecture:** Connect to Gmail via IMAP using App Passwords, scan for subscription-related emails, extract transaction data from email bodies, detect recurring patterns, and display results on dashboard. Daily background cron job scans all connected inboxes.

**Tech Stack:** Python, FastAPI, SQLAlchemy, imap-tools, cryptography, APScheduler, React, TanStack Query, Tailwind CSS

## Global Constraints

- Python 3.10+
- FastAPI backend
- SQLAlchemy ORM with SQLite
- React 18 + TypeScript frontend
- Tailwind CSS for styling
- Passwords encrypted with Fernet (AES-128-CBC)
- IMAP server: imap.gmail.com:993

---

## File Structure

| File | Purpose |
|------|---------|
| `app/models_db.py` | Add EmailCredentials, EmailScanResult tables |
| `app/services/imap_client.py` | IMAP connection and email search |
| `app/services/encryption.py` | Password encrypt/decrypt |
| `app/services/email_scanner.py` | Parse emails, extract transactions |
| `app/services/background_scanner.py` | Daily cron job orchestrator |
| `app/user/routes.py` | Add email API endpoints |
| `app/main.py` | Initialize scheduler on startup |
| `frontend/src/pages/EmailConnect.tsx` | Email connect page |
| `frontend/src/App.tsx` | Add route for EmailConnect |
| `tests/test_imap_client.py` | IMAP client tests |
| `tests/test_email_scanner.py` | Email scanner tests |
| `tests/test_encryption.py` | Encryption tests |

---

### Task 1: Add Database Models

**Files:**
- Modify: `app/models_db.py`
- Test: `tests/test_models.py`

**Interfaces:**
- Consumes: None
- Produces: EmailCredentials, EmailScanResult models

- [ ] **Step 1: Add EmailCredentials model**

```python
# app/models_db.py - Add after PasswordResetToken class

class EmailCredentials(Base):
    __tablename__ = "email_credentials"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    email = Column(String, nullable=False)
    imap_server = Column(String, default="imap.gmail.com")
    encrypted_password = Column(String, nullable=False)
    last_scan = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
```

- [ ] **Step 2: Add EmailScanResult model**

```python
# app/models_db.py - Add after EmailCredentials

class EmailScanResult(Base):
    __tablename__ = "email_scan_results"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    message_id = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    from_email = Column(String, nullable=True)
    received_date = Column(DateTime, nullable=True)
    transactions_json = Column(JSON, default=[])
    is_recurring = Column(Boolean, default=False)
    merchant_detected = Column(String, nullable=True)
    amount_detected = Column(Float, nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
```

- [ ] **Step 3: Update database initialization**

```python
# app/database.py - Add to init_db()

def init_db():
    from app.models_db import Base, EmailCredentials, EmailScanResult
    # Existing code...
    Base.metadata.create_all(bind=engine)
    
    # Add new columns if they don't exist (SQLite migration)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT encrypted_password FROM email_credentials LIMIT 1"))
    except Exception:
        engine.execute(text("ALTER TABLE email_credentials ADD COLUMN encrypted_password VARCHAR"))
```

- [ ] **Step 4: Run test to verify models work**

```bash
cd subscription-detector
python -c "from app.models_db import EmailCredentials, EmailScanResult; print('Models imported successfully')"
```

- [ ] **Step 5: Commit**

```bash
git add app/models_db.py app/database.py
git commit -m "feat: add EmailCredentials and EmailScanResult models"
```

---

### Task 2: Add Password Encryption Service

**Files:**
- Create: `app/services/encryption.py`
- Test: `tests/test_encryption.py`

**Interfaces:**
- Consumes: None
- Produces: encrypt_password(), decrypt_password()

- [ ] **Step 1: Write the failing test**

```python
# tests/test_encryption.py

from app.services.encryption import encrypt_password, decrypt_password

def test_encrypt_decrypt_roundtrip():
    original = "abcd efgh ijkl mnop"
    encrypted = encrypt_password(original)
    decrypted = decrypt_password(encrypted)
    assert decrypted == original
    assert encrypted != original

def test_different_encryptions():
    password = "test password"
    enc1 = encrypt_password(password)
    enc2 = encrypt_password(password)
    # Different each time (random IV)
    # But both decrypt to same value
    assert decrypt_password(enc1) == password
    assert decrypt_password(enc2) == password
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd subscription-detector
pytest tests/test_encryption.py -v
```
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.encryption'"

- [ ] **Step 3: Write implementation**

```python
# app/services/encryption.py

from cryptography.fernet import Fernet
import os
from dotenv import load_dotenv

load_dotenv()

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a key for development (store in .env for production)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"WARNING: Using generated ENCRYPTION_KEY. Add to .env: ENCRYPTION_KEY={ENCRYPTION_KEY}")

def encrypt_password(password: str) -> str:
    """Encrypt password using Fernet symmetric encryption."""
    f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted: str) -> str:
    """Decrypt password using Fernet symmetric encryption."""
    f = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
    return f.decrypt(encrypted.encode()).decode()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd subscription-detector
pytest tests/test_encryption.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/encryption.py tests/test_encryption.py
git commit -m "feat: add password encryption service with Fernet"
```

---

### Task 3: Add IMAP Client Service

**Files:**
- Create: `app/services/imap_client.py`
- Test: `tests/test_imap_client.py`

**Interfaces:**
- Consumes: None
- Produces: connect_gmail(), search_subscription_emails(), test_connection()

- [ ] **Step 1: Write the failing test**

```python
# tests/test_imap_client.py

from unittest.mock import Mock, patch
from app.services.imap_client import (
    connect_gmail,
    search_subscription_emails,
    test_connection,
    SUBSCRIPTION_KEYWORDS,
    KNOWN_SENDERS
)

def test_subscription_keywords_exist():
    assert 'receipt' in SUBSCRIPTION_KEYWORDS
    assert 'payment' in SUBSCRIPTION_KEYWORDS
    assert 'subscription' in SUBSCRIPTION_KEYWORDS

def test_known_senders_exist():
    assert 'netflix.com' in KNOWN_SENDERS
    assert 'spotify.com' in KNOWN_SENDERS
    assert 'amazon.com' in KNOWN_SENDERS

@patch('app.services.imap_client.MailBox')
def test_test_connection_success(mock_mailbox):
    mock_instance = Mock()
    mock_mailbox.return_value = mock_instance
    
    result = test_connection("test@gmail.com", "app_password")
    
    assert result == True
    mock_instance.login.assert_called_once()
    mock_instance.logout.assert_called_once()

@patch('app.services.imap_client.MailBox')
def test_test_connection_failure(mock_mailbox):
    mock_instance = Mock()
    mock_instance.login.side_effect = Exception("Connection failed")
    mock_mailbox.return_value = mock_instance
    
    result = test_connection("test@gmail.com", "wrong_password")
    
    assert result == False
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd subscription-detector
pytest tests/test_imap_client.py -v
```
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Write implementation**

```python
# app/services/imap_client.py

from imap_tools import MailBox, OR
from typing import List, Generator, Optional
import logging

logger = logging.getLogger(__name__)

IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993

SUBSCRIPTION_KEYWORDS = [
    'receipt', 'payment', 'subscription', 'invoice',
    'billing', 'renewal', 'charge', 'purchase',
    'order confirmation', 'payment confirmation'
]

KNOWN_SENDERS = [
    'netflix.com', 'spotify.com', 'amazon.com', 'apple.com',
    'microsoft.com', 'adobe.com', 'hulu.com', 'disneyplus.com',
    'hbo.com', 'youtube.com', 'dropbox.com', 'zoom.us',
    'github.com', 'notion.so', 'slack.com', 'figma.com'
]

def connect_gmail(email: str, app_password: str) -> MailBox:
    """Connect to Gmail IMAP server.
    
    Args:
        email: Gmail address (e.g., user@gmail.com)
        app_password: 16-character app password
        
    Returns:
        Authenticated MailBox instance
        
    Raises:
        Exception: If connection fails
    """
    mailbox = MailBox(IMAP_SERVER, IMAP_PORT)
    mailbox.login(email, app_password)
    logger.info(f"Connected to Gmail IMAP for {email}")
    return mailbox

def search_subscription_emails(
    mailbox: MailBox,
    days_back: int = 30,
    limit: int = 100
) -> List:
    """Search for subscription-related emails.
    
    Args:
        mailbox: Authenticated MailBox instance
        days_back: Number of days to search back
        limit: Maximum number of emails to return
        
    Returns:
        List of MailMessage objects
    """
    # Build OR criteria for all keywords and senders
    keyword_criteria = [f'SUBJECT "{kw}"' for kw in SUBSCRIPTION_KEYWORDS]
    sender_criteria = [f'FROM "{sender}"' for sender in KNOWN_SENDERS]
    
    all_criteria = keyword_criteria + sender_criteria
    criteria = OR(*all_criteria)
    
    results = list(mailbox.fetch(criteria, limit=limit))
    logger.info(f"Found {len(results)} subscription-related emails")
    return results

def test_connection(email: str, app_password: str) -> bool:
    """Test IMAP connection with credentials.
    
    Args:
        email: Gmail address
        app_password: App password
        
    Returns:
        True if connection successful, False otherwise
    """
    try:
        mailbox = connect_gmail(email, app_password)
        mailbox.logout()
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False

def get_email_body(msg) -> str:
    """Extract text body from email message.
    
    Args:
        msg: MailMessage object
        
    Returns:
        Email body text (prefer text over html)
    """
    return msg.text or msg.html or ""
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd subscription-detector
pytest tests/test_imap_client.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/imap_client.py tests/test_imap_client.py
git commit -m "feat: add IMAP client service for Gmail"
```

---

### Task 4: Add Email Scanner Service

**Files:**
- Create: `app/services/email_scanner.py`
- Test: `tests/test_email_scanner.py`

**Interfaces:**
- Consumes: imap_client.connect_gmail(), imap_client.search_subscription_emails(), email_parser.extract_transactions_from_email()
- Produces: scan_user_emails(), is_already_scanned(), store_scan_result()

- [ ] **Step 1: Write the failing test**

```python
# tests/test_email_scanner.py

from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from app.services.email_scanner import (
    scan_user_emails,
    is_already_scanned,
    store_scan_result
)

def test_is_already_scanned_true():
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = Mock()
    result = is_already_scanned("user123", "msg001", db)
    assert result == True

def test_is_already_scanned_false():
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = None
    result = is_already_scanned("user123", "msg001", db)
    assert result == False

def test_store_scan_result():
    db = Mock()
    store_scan_result(
        user_id="user123",
        message_id="msg001",
        subject="Netflix Receipt",
        from_email="billing@netflix.com",
        transactions=[{"date": "2026-01-01", "amount": "$15.99", "description": "Netflix"}],
        db=db
    )
    db.add.assert_called_once()
    db.commit.assert_called_once()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd subscription-detector
pytest tests/test_email_scanner.py -v
```
Expected: FAIL with "ModuleNotFoundError"

- [ ] **Step 3: Write implementation**

```python
# app/services/email_scanner.py

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import logging

from app.models_db import EmailScanResult
from app.parsers.email_parser import extract_transactions_from_email
from app.services.imap_client import connect_gmail, search_subscription_emails, get_email_body

logger = logging.getLogger(__name__)

def is_already_scanned(user_id: str, message_id: str, db: Session) -> bool:
    """Check if email was already scanned."""
    existing = db.query(EmailScanResult).filter(
        EmailScanResult.user_id == user_id,
        EmailScanResult.message_id == message_id
    ).first()
    return existing is not None

def store_scan_result(
    user_id: str,
    message_id: str,
    subject: Optional[str],
    from_email: Optional[str],
    transactions: List[Dict],
    db: Session
) -> EmailScanResult:
    """Store scan result in database."""
    # Extract merchant and amount from first transaction if available
    merchant = None
    amount = None
    if transactions:
        first_txn = transactions[0]
        merchant = first_txn.get('description', first_txn.get('merchant'))
        amount_str = first_txn.get('amount', '')
        try:
            # Clean amount string and convert to float
            amount_clean = amount_str.replace('$', '').replace('₹', '').replace('€', '').replace(',', '').strip()
            amount = float(amount_clean)
        except (ValueError, AttributeError):
            pass
    
    result = EmailScanResult(
        user_id=user_id,
        message_id=message_id,
        subject=subject,
        from_email=from_email,
        transactions_json=transactions,
        merchant_detected=merchant,
        amount_detected=amount,
        scanned_at=datetime.utcnow()
    )
    
    db.add(result)
    db.commit()
    logger.info(f"Stored scan result for user {user_id}, message {message_id}")
    return result

def scan_user_emails(
    user_id: str,
    email: str,
    app_password: str,
    db: Session,
    days_back: int = 30
) -> Dict:
    """Scan user's Gmail for subscription emails.
    
    Args:
        user_id: User ID
        email: Gmail address
        app_password: App password
        db: Database session
        days_back: Days to search back
        
    Returns:
        Dict with scan statistics
    """
    results = {
        "emails_scanned": 0,
        "new_emails": 0,
        "transactions_found": 0,
        "subscriptions_detected": 0
    }
    
    try:
        # Connect to Gmail
        mailbox = connect_gmail(email, app_password)
        
        # Search for subscription emails
        emails = search_subscription_emails(mailbox, days_back=days_back)
        
        for msg in emails:
            results["emails_scanned"] += 1
            
            # Check if already scanned
            if is_already_scanned(user_id, msg.uid, db):
                continue
            
            results["new_emails"] += 1
            
            # Extract transactions from email body
            email_text = get_email_body(msg)
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
        
        # Count unique merchants detected
        results["subscriptions_detected"] = count_detected_subscriptions(user_id, db)
        
        logger.info(f"Scan complete for {email}: {results}")
        return results
        
    except Exception as e:
        logger.error(f"Scan failed for {email}: {e}")
        raise

def count_detected_subscriptions(user_id: str, db: Session) -> int:
    """Count unique subscriptions detected for user."""
    from sqlalchemy import func
    
    result = db.query(
        func.count(func.distinct(EmailScanResult.merchant_detected))
    ).filter(
        EmailScanResult.user_id == user_id,
        EmailScanResult.merchant_detected.isnot(None)
    ).scalar()
    
    return result or 0

def get_user_scan_results(user_id: str, db: Session, limit: int = 50) -> List[EmailScanResult]:
    """Get scan results for user."""
    return db.query(EmailScanResult).filter(
        EmailScanResult.user_id == user_id
    ).order_by(
        EmailScanResult.scanned_at.desc()
    ).limit(limit).all()
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd subscription-detector
pytest tests/test_email_scanner.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/services/email_scanner.py tests/test_email_scanner.py
git commit -m "feat: add email scanner service for subscription detection"
```

---

### Task 5: Add Email API Endpoints

**Files:**
- Modify: `app/user/routes.py`
- Test: `tests/test_email_routes.py`

**Interfaces:**
- Consumes: encryption.encrypt_password/decrypt_password, imap_client.test_connection, email_scanner.scan_user_emails
- Produces: POST /api/email/connect, GET /api/email/status, POST /api/email/scan-now, DELETE /api/email/disconnect

- [ ] **Step 1: Add request/response models**

```python
# app/models.py - Add at bottom

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmailConnectRequest(BaseModel):
    email: str
    app_password: str

class EmailStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    last_scan: Optional[datetime] = None
    emails_scanned: int = 0
    subscriptions_detected: int = 0

class EmailScanResponse(BaseModel):
    status: str
    emails_scanned: int
    new_emails: int
    transactions_found: int
    subscriptions_detected: int
```

- [ ] **Step 2: Add email endpoints to routes**

```python
# app/user/routes.py - Add at bottom

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.middleware import get_current_user
from app.models_db import User, EmailCredentials, EmailScanResult
from app.models import EmailConnectRequest, EmailStatusResponse, EmailScanResponse
from app.services.encryption import encrypt_password, decrypt_password
from app.services.imap_client import test_connection
from app.services.email_scanner import scan_user_emails, get_user_scan_results, count_detected_subscriptions
from datetime import datetime

router = APIRouter()

@router.post("/api/email/connect", response_model=dict)
async def connect_email(
    request: EmailConnectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect Gmail account via IMAP."""
    # Test connection first
    if not test_connection(request.email, request.app_password):
        raise HTTPException(status_code=400, detail="Invalid email credentials")
    
    # Check if already connected
    existing = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id
    ).first()
    
    encrypted_pw = encrypt_password(request.app_password)
    
    if existing:
        # Update existing credentials
        existing.email = request.email
        existing.encrypted_password = encrypted_pw
        existing.is_active = True
    else:
        # Create new credentials
        credentials = EmailCredentials(
            user_id=current_user.id,
            email=request.email,
            encrypted_password=encrypted_pw,
            is_active=True
        )
        db.add(credentials)
    
    db.commit()
    return {"status": "connected", "message": "Gmail connected successfully"}

@router.get("/api/email/status", response_model=EmailStatusResponse)
async def email_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get email connection status."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id,
        EmailCredentials.is_active == True
    ).first()
    
    if not credentials:
        return EmailStatusResponse(connected=False)
    
    # Count scanned emails
    scan_count = db.query(EmailScanResult).filter(
        EmailScanResult.user_id == current_user.id
    ).count()
    
    # Count subscriptions
    sub_count = count_detected_subscriptions(current_user.id, db)
    
    return EmailStatusResponse(
        connected=True,
        email=credentials.email,
        last_scan=credentials.last_scan,
        emails_scanned=scan_count,
        subscriptions_detected=sub_count
    )

@router.post("/api/email/scan-now", response_model=EmailScanResponse)
async def scan_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger immediate email scan."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id,
        EmailCredentials.is_active == True
    ).first()
    
    if not credentials:
        raise HTTPException(status_code=400, detail="No email connected")
    
    # Decrypt password
    app_password = decrypt_password(credentials.encrypted_password)
    
    # Run scan
    results = scan_user_emails(
        user_id=current_user.id,
        email=credentials.email,
        app_password=app_password,
        db=db
    )
    
    # Update last scan time
    credentials.last_scan = datetime.utcnow()
    db.commit()
    
    return EmailScanResponse(
        status="completed",
        emails_scanned=results["emails_scanned"],
        new_emails=results["new_emails"],
        transactions_found=results["transactions_found"],
        subscriptions_detected=results["subscriptions_detected"]
    )

@router.delete("/api/email/disconnect")
async def disconnect_email(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Disconnect email account."""
    credentials = db.query(EmailCredentials).filter(
        EmailCredentials.user_id == current_user.id
    ).first()
    
    if credentials:
        db.delete(credentials)
        db.commit()
    
    return {"status": "disconnected"}
```

- [ ] **Step 3: Run test to verify endpoints work**

```bash
cd subscription-detector
python -c "from app.user.routes import router; print('Routes imported successfully')"
```

- [ ] **Step 4: Commit**

```bash
git add app/user/routes.py app/models.py
git commit -m "feat: add email API endpoints for connect, status, scan, disconnect"
```

---

### Task 6: Add Background Scheduler

**Files:**
- Create: `app/services/background_scanner.py`
- Modify: `app/main.py`

**Interfaces:**
- Consumes: email_scanner.scan_user_emails, encryption.decrypt_password
- Produces: start_scheduler(), daily_email_scan()

- [ ] **Step 1: Create background scanner service**

```python
# app/services/background_scanner.py

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import logging

from app.database import SessionLocal
from app.models_db import EmailCredentials
from app.services.encryption import decrypt_password
from app.services.email_scanner import scan_user_emails

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

def start_scheduler():
    """Start the background scheduler."""
    # Add daily scan job at 2:00 AM
    scheduler.add_job(
        daily_email_scan,
        'cron',
        hour=2,
        minute=0,
        id='daily_email_scan',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Background scheduler started with daily email scan at 2:00 AM")

def daily_email_scan():
    """Daily scan of all connected inboxes."""
    logger.info("Starting daily email scan...")
    db = SessionLocal()
    
    try:
        # Get all active email credentials
        credentials = db.query(EmailCredentials).filter(
            EmailCredentials.is_active == True
        ).all()
        
        logger.info(f"Found {len(credentials)} connected email accounts")
        
        for cred in credentials:
            try:
                # Decrypt password
                app_password = decrypt_password(cred.encrypted_password)
                
                # Run scan
                results = scan_user_emails(
                    user_id=cred.user_id,
                    email=cred.email,
                    app_password=app_password,
                    db=db
                )
                
                # Update last scan time
                cred.last_scan = datetime.utcnow()
                db.commit()
                
                logger.info(f"Scan complete for {cred.email}: {results}")
                
            except Exception as e:
                logger.error(f"Scan failed for {cred.email}: {e}")
                db.rollback()
                continue
        
        logger.info("Daily email scan completed")
        
    except Exception as e:
        logger.error(f"Daily scan failed: {e}")
    finally:
        db.close()

def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")
```

- [ ] **Step 2: Initialize scheduler in main.py**

```python
# app/main.py - Add imports and startup event

from app.services.background_scanner import start_scheduler, stop_scheduler

# Add to existing imports at top

@app.on_event("startup")
async def startup_event():
    init_db()
    start_scheduler()  # Add this line

@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()
```

- [ ] **Step 3: Install APScheduler**

```bash
cd subscription-detector
pip install apscheduler
echo "apscheduler==3.10.4" >> requirements.txt
```

- [ ] **Step 4: Test scheduler imports**

```bash
cd subscription-detector
python -c "from app.services.background_scanner import start_scheduler; print('Scheduler imported successfully')"
```

- [ ] **Step 5: Commit**

```bash
git add app/services/background_scanner.py app/main.py requirements.txt
git commit -m "feat: add background scheduler for daily email scans"
```

---

### Task 7: Add Frontend EmailConnect Page

**Files:**
- Create: `frontend/src/pages/EmailConnect.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: API endpoints from Task 5
- Produces: EmailConnect page component

- [ ] **Step 1: Create EmailConnect page**

```tsx
// frontend/src/pages/EmailConnect.tsx

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react';

export function EmailConnect() {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  
  // Get connection status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['email-status'],
    queryFn: () => api.get('/api/email/status').then(r => r.data)
  });
  
  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (data: { email: string; app_password: string }) =>
      api.post('/api/email/connect', data).then(r => r.data),
    onSuccess: () => {
      setEmail('');
      setAppPassword('');
    }
  });
  
  // Scan now mutation
  const scanMutation = useMutation({
    mutationFn: () => api.post('/api/email/scan-now').then(r => r.data)
  });
  
  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/api/email/disconnect').then(r => r.data)
  });
  
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Scanning</h1>
        <p className="text-muted-foreground">
          Connect your Gmail to automatically detect subscription emails.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to scan for subscription emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!status?.connected ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                connectMutation.mutate({ email, app_password: appPassword });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Gmail Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="app-password">App Password</Label>
                <Input
                  id="app-password"
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Generate at Google Account → Security → App Passwords
                </p>
              </div>
              
              {connectMutation.isError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connection failed. Please check your credentials.
                  </AlertDescription>
                </Alert>
              )}
              
              {connectMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Gmail connected successfully!
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                type="submit"
                disabled={connectMutation.isPending}
                className="w-full"
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Gmail'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Connected to <strong>{status.email}</strong>
                  <br />
                  Last scan: {status.last_scan
                    ? new Date(status.last_scan).toLocaleString()
                    : 'Never'}
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{status.emails_scanned}</div>
                  <div className="text-sm text-muted-foreground">Emails Scanned</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{status.subscriptions_detected}</div>
                  <div className="text-sm text-muted-foreground">Subscriptions Found</div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending}
                  className="flex-1"
                >
                  {scanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    'Scan Now'
                  )}
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
              
              {scanMutation.isSuccess && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Scan complete! {scanMutation.data.emails_scanned} emails scanned, 
                    {scanMutation.data.transactions_found} transactions found, 
                    {scanMutation.data.subscriptions_detected} subscriptions detected.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Go to <a href="https://myaccount.google.com/security" target="_blank" className="text-primary hover:underline">Google Account Security</a></li>
            <li>Enable <strong>2-Step Verification</strong> if not already enabled</li>
            <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-primary hover:underline">App Passwords</a></li>
            <li>Select <strong>Mail</strong> and your device</li>
            <li>Click <strong>Generate</strong></li>
            <li>Copy the 16-character password and paste above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

```tsx
// frontend/src/App.tsx - Add route

import { EmailConnect } from './pages/EmailConnect';

// Add to routes
<Route path="/email" element={<EmailConnect />} />
```

- [ ] **Step 3: Add to navigation**

```tsx
// frontend/src/components/layout/Navbar.tsx - Add nav item

import { Mail } from 'lucide-react';

// Add to nav items
{ path: '/email', label: 'Email Scanning', icon: Mail }
```

- [ ] **Step 4: Test frontend builds**

```bash
cd subscription-detector/frontend
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/EmailConnect.tsx frontend/src/App.tsx frontend/src/components/layout/Navbar.tsx
git commit -m "feat: add EmailConnect page for Gmail integration"
```

---

### Task 8: Integration Testing

**Files:**
- Test: `tests/test_email_integration.py`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Integration test verifying full flow

- [ ] **Step 1: Write integration test**

```python
# tests/test_email_integration.py

from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_email_connect_endpoint():
    """Test email connect endpoint structure."""
    # This would require mocking auth and IMAP
    # For now, verify endpoint exists
    response = client.post("/api/email/connect")
    # Should return 401 (no auth token)
    assert response.status_code in [401, 422]

def test_email_status_endpoint():
    """Test email status endpoint structure."""
    response = client.get("/api/email/status")
    # Should return 401 (no auth token)
    assert response.status_code in [401, 422]

def test_email_scan_endpoint():
    """Test email scan endpoint structure."""
    response = client.post("/api/email/scan-now")
    # Should return 401 (no auth token)
    assert response.status_code in [401, 422]
```

- [ ] **Step 2: Run integration tests**

```bash
cd subscription-detector
pytest tests/test_email_integration.py -v
```

- [ ] **Step 3: Commit**

```bash
git add tests/test_email_integration.py
git commit -m "test: add integration tests for email endpoints"
```

---

## Summary

| Task | Description | Files Created/Modified |
|------|-------------|------------------------|
| 1 | Database Models | models_db.py, database.py |
| 2 | Encryption Service | encryption.py |
| 3 | IMAP Client | imap_client.py |
| 4 | Email Scanner | email_scanner.py |
| 5 | API Endpoints | routes.py, models.py |
| 6 | Background Scheduler | background_scanner.py, main.py |
| 7 | Frontend Page | EmailConnect.tsx, App.tsx |
| 8 | Integration Tests | test_email_integration.py |

**Total Estimated Time:** 3-4 hours

---

## Dependencies to Install

```bash
pip install imap-tools cryptography apscheduler
```

Add to requirements.txt:
```
imap-tools==1.14.0
cryptography==44.0.0
apscheduler==3.10.4
```

---

## Environment Variables to Add

```env
# .env
ENCRYPTION_KEY=your-fernet-key-here
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-07-25-email-scanning-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
