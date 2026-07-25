import pytest
from datetime import date, timedelta
from app.parsers.sms_parser import (
    parse_sms, parse_sms_batch, parse_relative_date,
    parse_absolute_date, extract_amount, extract_description
)


class TestParseSms:
    def test_charged_format(self):
        result = parse_sms("Your account was charged $10.00 for Netflix")
        assert len(result) == 1
        assert result[0]['amount'] == 10.00
        assert 'NETFLIX' in result[0]['description']

    def test_transaction_of_format(self):
        result = parse_sms("Transaction of ₹500 at Spotify on 2026-07-20")
        assert len(result) == 1
        assert result[0]['amount'] == 500.0
        assert result[0]['date'] == '2026-07-20'
        assert 'SPOTIFY' in result[0]['description']

    def test_debit_card_format(self):
        result = parse_sms("Debit card transaction of €25.50 at Adobe")
        assert len(result) == 1
        assert result[0]['amount'] == 25.50
        assert 'ADOBE' in result[0]['description']

    def test_rs_format(self):
        result = parse_sms("Rs. 1,200.00 debited from your account for Amazon")
        assert len(result) == 1
        assert result[0]['amount'] == 1200.00
        assert 'AMAZON' in result[0]['description']

    def test_payment_to_format(self):
        result = parse_sms("Payment of $9.99 to Hulu processed")
        assert len(result) == 1
        assert result[0]['amount'] == 9.99
        assert 'HULU' in result[0]['description']

    def test_gbp_currency(self):
        result = parse_sms("£15.00 charged for Netflix subscription")
        assert len(result) == 1
        assert result[0]['amount'] == 15.00

    def test_no_amount_returns_empty(self):
        result = parse_sms("Your payment was processed successfully")
        assert result == []

    def test_empty_string_returns_empty(self):
        result = parse_sms("")
        assert result == []

    def test_none_returns_empty(self):
        result = parse_sms(None)
        assert result == []

    def test_date_defaults_to_today(self):
        result = parse_sms("Payment of $5.00 to Spotify")
        assert len(result) == 1
        assert result[0]['date'] == date.today().isoformat()


class TestRelativeDates:
    def test_today(self):
        result = parse_relative_date("today")
        assert result == date.today()

    def test_yesterday(self):
        result = parse_relative_date("yesterday")
        assert result == date.today() - timedelta(days=1)

    def test_days_ago(self):
        result = parse_relative_date("3 days ago")
        assert result == date.today() - timedelta(days=3)

    def test_weeks_ago(self):
        result = parse_relative_date("2 weeks ago")
        assert result == date.today() - timedelta(weeks=2)

    def test_invalid_relative(self):
        result = parse_relative_date("last month")
        assert result is None

    def test_relative_date_in_sms(self):
        result = parse_sms("Charged $20.00 for Netflix 2 days ago")
        assert len(result) == 1
        expected_date = (date.today() - timedelta(days=2)).isoformat()
        assert result[0]['date'] == expected_date


class TestAbsoluteDates:
    def test_iso_format(self):
        result = parse_absolute_date("2026-07-20")
        assert result == date(2026, 7, 20)

    def test_dd_mm_yyyy(self):
        result = parse_absolute_date("20/07/2026")
        assert result == date(2026, 7, 20)

    def test_mm_dd_yyyy(self):
        result = parse_absolute_date("07/20/2026")
        assert result == date(2026, 7, 20)

    def test_invalid_date(self):
        result = parse_absolute_date("not-a-date")
        assert result is None


class TestExtractAmount:
    def test_dollar(self):
        assert extract_amount("$10.00") == 10.0

    def test_rupee_symbol(self):
        assert extract_amount("₹500") == 500.0

    def test_euro(self):
        assert extract_amount("€25.50") == 25.5

    def test_pound(self):
        assert extract_amount("£15.00") == 15.0

    def test_rs_prefix(self):
        assert extract_amount("Rs. 1,200.00") == 1200.0

    def test_plain_number(self):
        assert extract_amount("42.50") == 42.5

    def test_no_number(self):
        assert extract_amount("no amount here") is None


class TestExtractDescription:
    def test_basic(self):
        desc = extract_description("Charged $10.00 for Netflix", "$10.00", None)
        assert 'NETFLIX' in desc

    def test_short_becomes_unknown(self):
        desc = extract_description("$5.00", "$5.00", None)
        assert desc == 'Unknown'


class TestParseSmsBatch:
    def test_multiple_lines(self):
        text = (
            "Charged $10.00 for Netflix\n"
            "Payment of $9.99 to Hulu processed\n"
            "Transaction of ₹500 at Spotify on 2026-07-20"
        )
        result = parse_sms_batch(text)
        assert len(result) == 3

    def test_empty_batch(self):
        result = parse_sms_batch("")
        assert result == []

    def test_blank_lines_skipped(self):
        text = "Charged $10.00 for Netflix\n\n\nPayment of $5.00 to Hulu"
        result = parse_sms_batch(text)
        assert len(result) == 2
