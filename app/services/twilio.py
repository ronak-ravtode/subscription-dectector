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
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")


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
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        return False

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    data = {
        "To": to,
        "Body": body,
    }

    # Use Messaging Service if available, otherwise use From number
    if TWILIO_MESSAGING_SERVICE_SID:
        data["MessagingServiceSid"] = TWILIO_MESSAGING_SERVICE_SID
    elif TWILIO_PHONE_NUMBER:
        data["From"] = TWILIO_PHONE_NUMBER
    else:
        return False

    response = requests.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN))
    return response.status_code == 201
