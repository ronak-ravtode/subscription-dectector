import hashlib
import hmac
import os
from dotenv import load_dotenv

load_dotenv()

WEBHOOK_SECRET = os.getenv("INBOUND_WEBHOOK_SECRET", "")

def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify webhook signature (SendGrid compatible)."""
    if not WEBHOOK_SECRET:
        return True
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)
