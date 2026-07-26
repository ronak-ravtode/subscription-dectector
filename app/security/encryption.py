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
