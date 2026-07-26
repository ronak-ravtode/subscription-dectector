# app/services/imap_client.py

from imap_tools import MailBox, OR, AND
from typing import List, Generator, Optional
from datetime import datetime, timedelta
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
    """Connect to Gmail IMAP server."""
    mailbox = MailBox(IMAP_SERVER, IMAP_PORT)
    mailbox.login(email, app_password)
    logger.info(f"Connected to Gmail IMAP for {email}")
    return mailbox

def search_subscription_emails(
    mailbox: MailBox,
    days_back: int = 30,
    limit: int = 100
) -> List:
    """Search for subscription-related emails from the last N days."""
    since_date = (datetime.now() - timedelta(days=days_back)).date()
    
    keyword_criteria = [AND(subject=kw, date_gte=since_date) for kw in SUBSCRIPTION_KEYWORDS]
    sender_criteria = [AND(from_=sender, date_gte=since_date) for sender in KNOWN_SENDERS]
    
    all_criteria = keyword_criteria + sender_criteria
    criteria = OR(*all_criteria)
    
    results = list(mailbox.fetch(criteria, limit=limit))
    logger.info(f"Found {len(results)} subscription-related emails since {since_date}")
    return results

def verify_connection(email: str, app_password: str) -> bool:
    """Test IMAP connection with credentials."""
    try:
        mailbox = connect_gmail(email, app_password)
        mailbox.logout()
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False

def get_email_body(msg) -> str:
    """Extract text body from email message."""
    return msg.text or msg.html or ""
