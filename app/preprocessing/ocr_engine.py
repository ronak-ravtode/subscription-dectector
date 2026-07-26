import subprocess
import tempfile
import os
from typing import Optional


class OCREngine:
    """Extracts text from images using Tesseract OCR."""

    def __init__(self, tesseract_path: str = None):
        self.tesseract_path = tesseract_path or 'tesseract'

    def extract_text(self, image_bytes: bytes, lang: str = 'eng') -> str:
        """Extract text from image using Tesseract."""
        try:
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(image_bytes)
                tmp_path = tmp.name

            output_path = tmp_path.replace('.png', '')

            cmd = [
                self.tesseract_path,
                tmp_path,
                output_path,
                '-l', lang,
                '--oem', '3',
                '--psm', '6',
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            txt_path = output_path + '.txt'
            text = ""
            if os.path.exists(txt_path):
                with open(txt_path, 'r') as f:
                    text = f.read()
            return text.strip()
        except Exception:
            return ""
        finally:
            for p in [output_path + '.txt', tmp_path]:
                if os.path.exists(p):
                    try:
                        os.unlink(p)
                    except Exception:
                        pass

    def is_available(self) -> bool:
        """Check if Tesseract is available."""
        try:
            result = subprocess.run(
                [self.tesseract_path, '--version'],
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False
