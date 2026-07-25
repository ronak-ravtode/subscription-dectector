import pytest
from datetime import date
from app.extractors.transaction_extractor import (
    parse_date, parse_amount, categorize_transaction, extract_transactions_from_text
)
from app.models import Transaction


def test_parse_date_mm_dd_yyyy():
    result = parse_date("01/15/2024")
    assert result is not None
    assert result.year == 2024
    assert result.month == 1
    assert result.day == 15


def test_parse_date_yyyy_mm_dd():
    result = parse_date("2024-01-15")
    assert result is not None
    assert result.year == 2024
    assert result.month == 1
    assert result.day == 15


def test_parse_date_mm_dd_yy():
    result = parse_date("01/15/24")
    assert result is not None
    assert result.year == 2024


def test_parse_date_invalid():
    result = parse_date("invalid-date")
    assert result is None


def test_parse_amount_with_dollar():
    assert parse_amount("$15.99") == 15.99


def test_parse_amount_with_comma():
    assert parse_amount("$1,234.56") == 1234.56


def test_parse_amount_with_rupee():
    assert parse_amount("₹500") == 500.0


def test_parse_amount_plain():
    assert parse_amount("29.99") == 29.99


def test_parse_amount_invalid():
    assert parse_amount("abc") is None


def test_categorize_netflix():
    assert categorize_transaction("NETFLIX.COM") == "entertainment"


def test_categorize_spotify():
    assert categorize_transaction("SPOTIFY PREMIUM") == "entertainment"


def test_categorize_adobe():
    assert categorize_transaction("ADOBE CREATIVE CLOUD") == "software"


def test_categorize_unknown():
    assert categorize_transaction("RANDOM STORE") == "other"


def test_extract_transactions_basic():
    text = "01/15/2024 | $15.99 | NETFLIX.COM"
    transactions, warnings = extract_transactions_from_text(text)
    assert len(transactions) == 1
    assert transactions[0].amount == 15.99
    assert transactions[0].description == "NETFLIX.COM"


def test_extract_transactions_multiple():
    text = """01/15/2024 | $15.99 | NETFLIX.COM
02/15/2024 | $15.99 | NETFLIX.COM
03/15/2024 | $15.99 | NETFLIX.COM"""
    transactions, warnings = extract_transactions_from_text(text)
    assert len(transactions) == 3


def test_extract_transactions_empty():
    transactions, warnings = extract_transactions_from_text("")
    assert len(transactions) == 0
