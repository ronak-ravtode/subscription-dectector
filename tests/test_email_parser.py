import pytest
from app.parsers.email_parser import extract_transactions_from_email, strip_html_tags


class TestStripHtmlTags:
    def test_basic_html(self):
        result = strip_html_tags("<p>Hello World</p>")
        assert result == "Hello World"

    def test_nested_tags(self):
        result = strip_html_tags("<div><span>Test</span></div>")
        assert result == "Test"

    def test_html_entities(self):
        result = strip_html_tags("Price: $10&amp;50")
        assert "10&50" in result

    def test_plain_text_unchanged(self):
        result = strip_html_tags("Just plain text")
        assert result == "Just plain text"


class TestExtractTransactionsFromEmail:
    def test_html_email(self):
        html = "<p>07/20/2026 $10.00 Netflix</p>\n<p>07/15/2026 $9.99 Hulu</p>"
        result = extract_transactions_from_email(html)
        assert len(result) >= 1
        assert result[0]['date'] == '07/20/2026'
        assert '$10.00' in result[0]['amount']
        assert 'Netflix' in result[0]['description']

    def test_plain_text_email(self):
        text = "07/20/2026 $10.00 Netflix | 07/15/2026 $9.99 Hulu"
        result = extract_transactions_from_email(text)
        assert len(result) >= 2

    def test_mixed_html_text(self):
        content = "<p>07/20/2026 $10.00 Netflix</p>\n07/15/2026 $9.99 Hulu"
        result = extract_transactions_from_email(content)
        assert len(result) >= 1

    def test_empty_content(self):
        result = extract_transactions_from_email("")
        assert result == []

    def test_no_transactions(self):
        result = extract_transactions_from_email("Hello, this is a plain email with no financial data.")
        assert result == []
