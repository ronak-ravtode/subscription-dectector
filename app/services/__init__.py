import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@subguard.app")

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send password reset email with link. Returns True on success."""
    reset_url = f"http://localhost:5173/reset-password?token={reset_token}"
    
    body = f"""
    You requested a password reset for your SubGuard account.

    Click the link below to reset your password:
    {reset_url}

    This link expires in 1 hour.
    If you didn't request this, ignore this email.
    """
    
    msg = MIMEText(body)
    msg["Subject"] = "SubGuard - Password Reset"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
