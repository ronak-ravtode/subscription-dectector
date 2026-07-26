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
        credentials = db.query(EmailCredentials).filter(
            EmailCredentials.is_active == True
        ).all()
        
        logger.info(f"Found {len(credentials)} connected email accounts")
        
        for cred in credentials:
            try:
                app_password = decrypt_password(cred.encrypted_password)
                
                results = scan_user_emails(
                    user_id=cred.user_id,
                    email=cred.email,
                    app_password=app_password,
                    db=db
                )
                
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
