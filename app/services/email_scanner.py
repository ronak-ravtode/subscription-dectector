from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import logging

from app.models_db import EmailScanResult
from app.parsers.email_parser import extract_transactions_from_email, is_subscription_email
from app.services.imap_client import connect_gmail, search_subscription_emails, get_email_body

logger = logging.getLogger(__name__)

# Billing/payment keywords that confirm this is an actual transaction email
BILLING_KEYWORDS = [
    'receipt', 'payment', 'charged', 'billed', 'invoice',
    'transaction', 'purchase', 'order confirmation',
    'payment confirmation', 'your receipt from',
]

# Strong subscription signals that appear in billing emails
STRONG_RECURRING_SIGNALS = [
    'auto-renew', 'recurring charge', 'next billing',
    'subscription renewal', 'membership renewal',
    'monthly plan', 'annual plan', 'yearly plan',
]


def _is_billing_email(subject: str, body: str) -> bool:
    """Check if email is an actual billing/payment email (not just a notification)."""
    text = f"{subject or ''} {body or ''}".lower()
    return any(keyword in text for keyword in BILLING_KEYWORDS)


def _is_likely_recurring(subject: str, body: str, from_email: str = None) -> bool:
    """Detect if email indicates a recurring subscription payment."""
    text = f"{subject or ''} {body or ''} {from_email or ''}".lower()

    # Must be a billing email first - skip notifications, security alerts, promos
    if not _is_billing_email(subject, body):
        return False

    # Check for strong recurring signals
    if any(signal in text for signal in STRONG_RECURRING_SIGNALS):
        return True

    # Check for recurring signals + amount (stronger indicator)
    has_amount = any(c in text for c in ['$', '₹', '€', '£'])
    signal_count = sum(1 for signal in [
        'subscription', 'membership', 'monthly', 'annual',
        'renewal', 'auto-renew',
    ] if signal in text)

    if has_amount and signal_count >= 1:
        return True

    return False


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
    received_date: Optional[datetime],
    transactions: List[Dict],
    is_subscription: bool,
    is_recurring: bool,
    db: Session
) -> EmailScanResult:
    """Store scan result in database."""
    merchant = None
    amount = None
    
    if transactions:
        first_txn = transactions[0]
        # Try 'merchant' first (new parser), then 'description' (legacy)
        merchant = first_txn.get('merchant') or first_txn.get('description')
        amount_str = first_txn.get('amount', '')
        if amount_str:
            try:
                amount_clean = str(amount_str).replace('$', '').replace('₹', '').replace('€', '').replace('£', '').replace(',', '').strip()
                amount = float(amount_clean)
            except (ValueError, AttributeError):
                pass
    
    result = EmailScanResult(
        user_id=user_id,
        message_id=message_id,
        subject=subject,
        from_email=from_email,
        received_date=received_date,
        transactions_json=transactions,
        merchant_detected=merchant,
        amount_detected=amount,
        is_recurring=is_recurring,
        scanned_at=datetime.utcnow()
    )
    
    db.add(result)
    db.commit()
    logger.info(f"Stored scan result for user {user_id}, message {message_id}, merchant={merchant}, recurring={is_recurring}")
    return result


def scan_user_emails(
    user_id: str,
    email: str,
    app_password: str,
    db: Session,
    days_back: int = 30
) -> Dict:
    """Scan user's Gmail for subscription emails."""
    results = {
        "emails_scanned": 0,
        "new_emails": 0,
        "transactions_found": 0,
        "subscriptions_detected": 0
    }
    
    try:
        mailbox = connect_gmail(email, app_password)
        emails = search_subscription_emails(mailbox, days_back=days_back)
        
        for msg in emails:
            results["emails_scanned"] += 1
            
            if is_already_scanned(user_id, msg.uid, db):
                continue
            
            results["new_emails"] += 1
            
            # Extract email body and metadata
            email_text = get_email_body(msg)
            subject = msg.subject
            from_email_addr = msg.from_
            
            # Get email date from IMAP (msg.date is a datetime object)
            received_date = msg.date if hasattr(msg, 'date') and msg.date else datetime.utcnow()
            
            # Parse transactions from email content
            transactions = extract_transactions_from_email(
                subject=subject,
                from_email=from_email_addr,
                email_content=email_text
            )
            
            # Determine if this is a subscription-related email
            is_subscription = False
            if transactions and transactions[0].get('is_subscription'):
                is_subscription = True
            elif subject or email_text:
                is_subscription = is_subscription_email(subject, email_text)
            
            # Determine if this is likely a recurring subscription
            is_recurring = _is_likely_recurring(subject, email_text, from_email_addr)
            
            # Store result - even if no transactions found, we still store the email
            # so it appears in scan results and subscription emails aren't silently dropped
            store_scan_result(
                user_id=user_id,
                message_id=msg.uid,
                subject=subject,
                from_email=from_email_addr,
                received_date=received_date,
                transactions=transactions,
                is_subscription=is_subscription,
                is_recurring=is_recurring,
                db=db
            )
            
            if transactions:
                results["transactions_found"] += len(transactions)
        
        mailbox.logout()
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
