import os
import tempfile
import logging
from typing import Optional
from PyPDF2 import PdfReader
from app.parsers.gemini_vision import extract_text_from_pdf_image

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """Try PyPDF2 first, return text."""
    try:
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as e:
        logger.warning("Failed to extract text from PDF %s: %s", file_path, e)
        return ""


def extract_text_with_gemini(file_path: str) -> str:
    """Fallback: send PDF to Gemini Vision."""
    return extract_text_from_pdf_image(file_path)


def parse_pdf(file_path: str) -> str:
    """Main entry: try PyPDF2, fallback to Gemini if text is insufficient."""
    text = extract_text_from_pdf(file_path)

    if len(text.strip()) < 50:
        gemini_text = extract_text_with_gemini(file_path)
        if gemini_text:
            return gemini_text

    return text
