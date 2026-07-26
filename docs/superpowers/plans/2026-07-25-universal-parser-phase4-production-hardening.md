# Universal Bank Statement Parser — Phase 4: Production Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add security, monitoring, audit logging, rate limiting, and production-ready features.

**Architecture:** Cross-cutting concerns for security, observability, and reliability.

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy, cryptography

## Global Constraints

- Python 3.10+
- Existing tests must continue to pass
- No breaking API changes
- Privacy-first design

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/security/encryption.py` | Data encryption at rest |
| `app/security/redaction.py` | PII redaction |
| `app/security/rate_limiter.py` | API rate limiting |
| `app/audit/audit_logger.py` | Audit logging |
| `app/monitoring/metrics.py` | Metrics collection |
| `app/middleware/security.py` | Security middleware |
| `app/middleware/rate_limit.py` | Rate limit middleware |
| `tests/test_encryption.py` | Encryption tests |
| `tests/test_redaction.py` | Redaction tests |
| `tests/test_rate_limiter.py` | Rate limiter tests |
| `tests/test_audit.py` | Audit tests |
| `tests/test_monitoring.py` | Monitoring tests |

---

### Task 1: Add Data Encryption

**Files:**
- Create: `app/security/encryption.py`
- Test: `tests/test_encryption.py`

**Interfaces:**
- Consumes: Sensitive data
- Produces: Encrypted data

- [ ] **Step 1: Write the failing test**

```python
def test_encrypt_decrypt():
    from app.security.encryption import EncryptionManager
    
    manager = EncryptionManager()
    
    original = "sensitive data"
    encrypted = manager.encrypt(original)
    decrypted = manager.decrypt(encrypted)
    
    assert encrypted != original
    assert decrypted == original
```

- [ ] **Step 2: Write implementation**

```python
import os
import base64
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

class EncryptionManager:
    """Handles data encryption at rest."""
    
    def __init__(self, key: str = None):
        if key:
            self.key = key.encode() if isinstance(key, str) else key
        else:
            env_key = os.getenv("ENCRYPTION_KEY")
            if env_key:
                self.key = env_key.encode()
            else:
                self.key = Fernet.generate_key()
        
        self.cipher = Fernet(self.key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string."""
        encrypted = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string."""
        decoded = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = self.cipher.decrypt(decoded)
        return decrypted.decode()
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_encryption.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/security/encryption.py tests/test_encryption.py
git commit -m "feat: add data encryption at rest"
```

---

### Task 2: Add PII Redaction

**Files:**
- Create: `app/security/redaction.py`
- Test: `tests/test_redaction.py`

**Interfaces:**
- Consumes: Text with PII
- Produces: Redacted text

- [ ] **Step 1: Write the failing test**

```python
def test_redact_account_number():
    from app.security.redaction import Redactor
    
    redactor = Redactor()
    
    text = "Account: 1234567890123456"
    redacted = redactor.redact(text)
    
    assert "1234567890123456" not in redacted
    assert "***" in redacted


def test_redact_ifsc_code():
    from app.security.redaction import Redactor
    
    redactor = Redactor()
    
    text = "IFSC: HDFC0001234"
    redacted = redactor.redact(text)
    
    assert "HDFC0001234" not in redacted
    assert "***" in redacted
```

- [ ] **Step 2: Write implementation**

```python
import re
from typing import Dict, Pattern

class Redactor:
    """Redacts PII from text."""
    
    def __init__(self):
        self.patterns: Dict[str, Pattern] = {
            'account_number': re.compile(r'\b\d{9,18}\b'),
            'ifsc_code': re.compile(r'\b[A-Z]{4}0[A-Z0-9]{6}\b'),
            'upi_id': re.compile(r'\b[\w.-]+@[\w]+\b'),
            'phone_number': re.compile(r'\b\d{10}\b'),
            'email': re.compile(r'\b[\w.-]+@[\w.-]+\.\w+\b'),
        }
    
    def redact(self, text: str, pii_types: list = None) -> str:
        """Redact PII from text."""
        if pii_types is None:
            pii_types = list(self.patterns.keys())
        
        for pii_type in pii_types:
            if pii_type in self.patterns:
                text = self.patterns[pii_type].sub('***', text)
        
        return text
    
    def redact_dict(self, data: dict, pii_types: list = None) -> dict:
        """Redact PII from dictionary values."""
        redacted = {}
        for key, value in data.items():
            if isinstance(value, str):
                redacted[key] = self.redact(value, pii_types)
            else:
                redacted[key] = value
        return redacted
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_redaction.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/security/redaction.py tests/test_redaction.py
git commit -m "feat: add PII redaction"
```

---

### Task 3: Add Rate Limiter

**Files:**
- Create: `app/security/rate_limiter.py`
- Test: `tests/test_rate_limiter.py`

**Interfaces:**
- Consumes: Request info
- Produces: Allow/deny decision

- [ ] **Step 1: Write the failing test**

```python
def test_rate_limit_within_bounds():
    from app.security.rate_limiter import RateLimiter
    
    limiter = RateLimiter(max_requests=10, window_seconds=60)
    
    # Should allow first request
    assert limiter.is_allowed("user1") is True


def test_rate_limit_exceeded():
    from app.security.rate_limiter import RateLimiter
    
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    
    # First two requests allowed
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user1") is True
    
    # Third request denied
    assert limiter.is_allowed("user1") is False
```

- [ ] **Step 2: Write implementation**

```python
import time
from collections import defaultdict
from typing import Dict, List

class RateLimiter:
    """Token bucket rate limiter."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed."""
        now = time.time()
        cutoff = now - self.window_seconds
        
        # Remove old requests
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        
        # Check limit
        if len(self.requests[key]) >= self.max_requests:
            return False
        
        # Record request
        self.requests[key].append(now)
        return True
    
    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key."""
        now = time.time()
        cutoff = now - self.window_seconds
        
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]
        
        return max(0, self.max_requests - len(self.requests[key]))
    
    def reset(self, key: str):
        """Reset rate limit for key."""
        self.requests[key] = []
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_rate_limiter.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/security/rate_limiter.py tests/test_rate_limiter.py
git commit -m "feat: add rate limiter"
```

---

### Task 4: Add Audit Logger

**Files:**
- Create: `app/audit/audit_logger.py`
- Test: `tests/test_audit.py`

**Interfaces:**
- Consumes: Action details
- Produces: Audit log entry

- [ ] **Step 1: Write the failing test**

```python
def test_log_action():
    from app.audit.audit_logger import AuditLogger
    
    logger = AuditLogger()
    
    result = logger.log(
        user_id="user123",
        action="upload",
        document_id="doc456",
        details={"filename": "statement.pdf"}
    )
    
    assert result is True
    assert len(logger.get_logs()) == 1
```

- [ ] **Step 2: Write implementation**

```python
import json
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Any, Optional

@dataclass
class AuditEntry:
    timestamp: str
    user_id: str
    action: str
    document_id: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogger:
    """Logs audit events."""
    
    def __init__(self):
        self.logs: List[AuditEntry] = []
    
    def log(
        self,
        user_id: str,
        action: str,
        document_id: str = None,
        details: Dict[str, Any] = None,
        ip_address: str = None,
        user_agent: str = None,
    ) -> bool:
        """Log an audit event."""
        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            user_id=user_id,
            action=action,
            document_id=document_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.logs.append(entry)
        return True
    
    def get_logs(
        self,
        user_id: str = None,
        action: str = None,
        limit: int = 100,
    ) -> List[AuditEntry]:
        """Get audit logs with optional filters."""
        filtered = self.logs
        
        if user_id:
            filtered = [l for l in filtered if l.user_id == user_id]
        
        if action:
            filtered = [l for l in filtered if l.action == action]
        
        return filtered[-limit:]
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_audit.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/audit/audit_logger.py tests/test_audit.py
git commit -m "feat: add audit logger"
```

---

### Task 5: Add Security Middleware

**Files:**
- Create: `app/middleware/security.py`
- Test: `tests/test_security_middleware.py`

**Interfaces:**
- Consumes: FastAPI app
- Produces: Protected app

- [ ] **Step 1: Write the failing test**

```python
def test_security_headers():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from app.middleware.security import SecurityMiddleware
    
    app = FastAPI()
    app.add_middleware(SecurityMiddleware)
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "ok"}
    
    client = TestClient(app)
    response = client.get("/test")
    
    assert response.status_code == 200
    assert "X-Content-Type-Options" in response.headers
    assert "X-Frame-Options" in response.headers
```

- [ ] **Step 2: Write implementation**

```python
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityMiddleware(BaseHTTPMiddleware):
    """Adds security headers to responses."""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_security_middleware.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/middleware/security.py tests/test_security_middleware.py
git commit -m "feat: add security middleware"
```

---

### Task 6: Add Monitoring Metrics

**Files:**
- Create: `app/monitoring/metrics.py`
- Test: `tests/test_monitoring.py`

**Interfaces:**
- Consumes: Metric events
- Produces: Metrics data

- [ ] **Step 1: Write the failing test**

```python
def test_record_metric():
    from app.monitoring.metrics import MetricsCollector
    
    collector = MetricsCollector()
    
    collector.record("upload_count", 1)
    collector.record("processing_time", 2.5)
    
    assert collector.get_count("upload_count") == 1
    assert collector.get_sum("processing_time") == 2.5
```

- [ ] **Step 2: Write implementation**

```python
from collections import defaultdict
from typing import Dict, List
import time

class MetricsCollector:
    """Collects and aggregates metrics."""
    
    def __init__(self):
        self.counters: Dict[str, int] = defaultdict(int)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.gauges: Dict[str, float] = {}
    
    def record(self, name: str, value: float):
        """Record a metric value."""
        if isinstance(value, int):
            self.counters[name] += value
        else:
            self.histograms[name].append(value)
            self.gauges[name] = value
    
    def get_count(self, name: str) -> int:
        """Get counter value."""
        return self.counters.get(name, 0)
    
    def get_sum(self, name: str) -> float:
        """Get sum of histogram values."""
        return sum(self.histograms.get(name, []))
    
    def get_avg(self, name: str) -> float:
        """Get average of histogram values."""
        values = self.histograms.get(name, [])
        return sum(values) / len(values) if values else 0.0
    
    def get_gauge(self, name: str) -> float:
        """Get gauge value."""
        return self.gauges.get(name, 0.0)
    
    def get_all(self) -> Dict:
        """Get all metrics."""
        return {
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
        }
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_monitoring.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/monitoring/metrics.py tests/test_monitoring.py
git commit -m "feat: add monitoring metrics collector"
```

---

### Task 7: Integrate Security with Main App

**Files:**
- Modify: `app/main.py`

**Interfaces:**
- Consumes: Security components
- Produces: Protected app

- [ ] **Step 1: Add middleware and dependencies**

```python
from app.middleware.security import SecurityMiddleware
from app.security.rate_limiter import RateLimiter
from app.audit.audit_logger import AuditLogger

# Add middleware
app.add_middleware(SecurityMiddleware)

# Initialize components
rate_limiter = RateLimiter(max_requests=100, window_seconds=3600)
audit_logger = AuditLogger()
```

- [ ] **Step 2: Run tests to verify everything works**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add app/main.py
git commit -m "feat: integrate security middleware and rate limiter"
```

---

### Task 8: Final Verification

**Files:**
- Run full test suite
- Verify security features work

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Manual verification**

```bash
python -c "
from app.security.encryption import EncryptionManager
from app.security.redaction import Redactor
from app.security.rate_limiter import RateLimiter
from app.audit.audit_logger import AuditLogger
from app.monitoring.metrics import MetricsCollector

# Test encryption
enc = EncryptionManager()
encrypted = enc.encrypt('secret')
decrypted = enc.decrypt(encrypted)
print(f'Encryption: {decrypted == \"secret\"}')

# Test redaction
redactor = Redactor()
redacted = redactor.redact('Account: 1234567890123456')
print(f'Redaction: {\"***\" in redacted}')

# Test rate limiter
limiter = RateLimiter(max_requests=5, window_seconds=60)
allowed = all(limiter.is_allowed('test') for _ in range(5))
print(f'Rate Limiter: {allowed}')

# Test audit logger
logger = AuditLogger()
logger.log('user1', 'upload', 'doc123')
print(f'Audit Logger: {len(logger.get_logs()) == 1}')

# Test metrics
metrics = MetricsCollector()
metrics.record('test', 1)
print(f'Metrics: {metrics.get_count(\"test\") == 1}')
"
```

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete Phase 4 - Production Hardening

- Add data encryption at rest
- Add PII redaction
- Add rate limiter
- Add audit logger
- Add security middleware
- Add monitoring metrics
- Integrate with main app"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Add Data Encryption | 20 min |
| 2 | Add PII Redaction | 20 min |
| 3 | Add Rate Limiter | 20 min |
| 4 | Add Audit Logger | 20 min |
| 5 | Add Security Middleware | 20 min |
| 6 | Add Monitoring Metrics | 20 min |
| 7 | Integrate Security with Main App | 20 min |
| 8 | Final Verification | 15 min |
| **Total** | | **~2.5 hours** |

---

## Expected Results

After Phase 4, the system will:
1. Encrypt sensitive data at rest
2. Redact PII from outputs
3. Rate limit API requests
4. Log all audit events
5. Add security headers
6. Collect monitoring metrics
