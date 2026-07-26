import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    import fitz  # PyMuPDF
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False

try:
    from PyPDF2 import PdfReader
    PYPDF2_AVAILABLE = True
except ImportError:
    PYPDF2_AVAILABLE = False

from app.parsers.gemini_vision import extract_text_from_pdf_image


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using PyPDF2 or PyMuPDF (fitz) with row reconstruction."""
    # 1. Try PyPDF2 first (preserves mock unit test compatibility)
    if PYPDF2_AVAILABLE:
        try:
            reader = PdfReader(file_path)
            pypdf_parts = [page.extract_text() for page in reader.pages if page.extract_text()]
            full_text = "\n".join(pypdf_parts).strip()
            if full_text:
                return full_text
        except Exception as e:
            logger.warning("PyPDF2 extraction failed for %s: %s", file_path, e)

    # 2. Try PyMuPDF (fitz) fallback with y-coordinate row position reconstruction
    if FITZ_AVAILABLE and file_path and os.path.exists(file_path):
        doc = None
        try:
            doc = fitz.open(file_path)
            all_lines = []
            for page in doc:
                words = page.get_text("words")
                if not words:
                    continue
                rows = {}
                for w in words:
                    y_key = round(w[1] / 3) * 3
                    rows.setdefault(y_key, []).append(w)
                for y_key in sorted(rows.keys()):
                    row_words = sorted(rows[y_key], key=lambda w: w[0])
                    line_str = " ".join(w[4] for w in row_words)
                    if line_str.strip():
                        all_lines.append(line_str.strip())

            full_text = "\n".join(all_lines).strip()
            if full_text:
                return full_text
        except Exception as e:
            logger.warning("PyMuPDF extraction failed for %s: %s", file_path, e)
        finally:
            if doc:
                try:
                    doc.close()
                except Exception:
                    pass

    return ""


def extract_text_with_gemini(file_path: str) -> str:
    """Fallback: send PDF as image to Gemini Vision for OCR text extraction."""
    return extract_text_from_pdf_image(file_path)


def parse_pdf(file_path: str) -> str:
    """Main entrypoint: try native text extraction, fallback to Gemini Vision OCR if text is sparse."""
    text = extract_text_from_pdf(file_path)

    if len(text.strip()) < 50:
        gemini_text = extract_text_with_gemini(file_path)
        if gemini_text:
            return gemini_text

    return text
