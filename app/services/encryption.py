# app/services/encryption.py

from app.security.encryption import EncryptionManager

_manager = EncryptionManager()


def encrypt_password(password: str) -> str:
    """Encrypt password using Fernet symmetric encryption."""
    return _manager.encrypt(password)


def decrypt_password(encrypted: str) -> str:
    """Decrypt password using Fernet symmetric encryption."""
    return _manager.decrypt(encrypted)
