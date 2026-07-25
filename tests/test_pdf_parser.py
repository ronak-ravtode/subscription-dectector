import pytest
import os
import tempfile
from unittest.mock import patch, MagicMock
from app.parsers.pdf_parser import parse_pdf, extract_text_from_pdf


def test_parse_pdf_nonexistent_file():
    result = parse_pdf("nonexistent.pdf")
    assert result == ""


def test_extract_text_from_pdf_nonexistent():
    result = extract_text_from_pdf("nonexistent.pdf")
    assert result == ""


def test_parse_pdf_empty_pdf():
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(b"%PDF-1.4 fake content")
        tmp_path = f.name

    try:
        result = parse_pdf(tmp_path)
        assert isinstance(result, str)
    finally:
        os.unlink(tmp_path)


def test_extract_text_from_pdf_success():
    """Test successful PDF text extraction with mocked PdfReader."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "07/20/2026 Netflix $10.00"

    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]

    with patch('app.parsers.pdf_parser.PdfReader', return_value=mock_reader):
        result = extract_text_from_pdf("fake.pdf")
        assert result == "07/20/2026 Netflix $10.00"


def test_parse_pdf_with_sufficient_text():
    """Test parse_pdf returns text when PyPDF2 extracts enough content."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "07/20/2026 Netflix $10.00\n07/15/2026 Hulu $9.99"

    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]

    with patch('app.parsers.pdf_parser.PdfReader', return_value=mock_reader):
        result = parse_pdf("fake.pdf")
        assert "Netflix" in result
        assert "Hulu" in result


def test_parse_pdf_falls_back_to_gemini():
    """Test parse_pdf uses Gemini when PyPDF2 extracts insufficient text."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "short"

    mock_reader = MagicMock()
    mock_reader.pages = [mock_page]

    with patch('app.parsers.pdf_parser.PdfReader', return_value=mock_reader), \
         patch('app.parsers.pdf_parser.extract_text_with_gemini', return_value="Gemini extracted text"):
        result = parse_pdf("fake.pdf")
        assert result == "Gemini extracted text"


def test_extract_text_multiple_pages():
    """Test extraction concatenates text from multiple pages."""
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "Page 1 content"
    mock_page2 = MagicMock()
    mock_page2.extract_text.return_value = "Page 2 content"

    mock_reader = MagicMock()
    mock_reader.pages = [mock_page1, mock_page2]

    with patch('app.parsers.pdf_parser.PdfReader', return_value=mock_reader):
        result = extract_text_from_pdf("fake.pdf")
        assert "Page 1 content" in result
        assert "Page 2 content" in result

