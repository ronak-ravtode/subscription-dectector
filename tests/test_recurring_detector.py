import pytest
from datetime import date
from app.models import Transaction, Frequency, PriceTrend
from app.detectors.recurring_detector import (
    group_by_merchant, calculate_frequency, check_amount_consistency,
    detect_price_trend, detect_recurring
)


def make_txn(day: int, amount: float, desc: str, year: int = 2024, month: int = 1) -> Transaction:
    return Transaction(
        id="test",
        date=date(year, month, day),
        amount=amount,
        description=desc,
    )


def test_group_by_merchant():
    txns = [
        make_txn(15, 15.99, "NETFLIX.COM", month=1),
        make_txn(15, 15.99, "NETFLIX.COM", month=2),
        make_txn(15, 9.99, "SPOTIFY", month=1),
    ]
    groups = group_by_merchant(txns)
    assert len(groups) == 2


def test_group_by_merchant_fuzzy():
    txns = [
        make_txn(15, 15.99, "NETFLIX", month=1),
        make_txn(15, 15.99, "NETFLIX.COM", month=2),
    ]
    groups = group_by_merchant(txns)
    assert len(groups) == 1


def test_calculate_frequency_monthly():
    txns = [
        make_txn(15, 15.99, "TEST", month=1),
        make_txn(15, 15.99, "TEST", month=2),
        make_txn(15, 15.99, "TEST", month=3),
        make_txn(15, 15.99, "TEST", month=4),
    ]
    freq = calculate_frequency(txns)
    assert freq == Frequency.MONTHLY


def test_calculate_frequency_weekly():
    txns = [
        make_txn(1, 5.99, "TEST", month=1),
        make_txn(8, 5.99, "TEST", month=1),
        make_txn(15, 5.99, "TEST", month=1),
        make_txn(22, 5.99, "TEST", month=1),
    ]
    freq = calculate_frequency(txns)
    assert freq == Frequency.WEEKLY


def test_check_amount_consistency_consistent():
    amounts = [15.99, 15.99, 16.00, 15.98]
    assert check_amount_consistency(amounts) is True


def test_check_amount_consistency_inconsistent():
    amounts = [15.99, 50.00, 15.99]
    assert check_amount_consistency(amounts) is False


def test_detect_price_trend_stable():
    amounts = [15.99, 15.99, 15.99, 15.99]
    assert detect_price_trend(amounts) == PriceTrend.STABLE


def test_detect_price_trend_increased():
    amounts = [9.99, 9.99, 12.99, 12.99]
    assert detect_price_trend(amounts) == PriceTrend.INCREASED


def test_detect_price_trend_decreased():
    amounts = [19.99, 19.99, 14.99, 14.99]
    assert detect_price_trend(amounts) == PriceTrend.DECREASED


def test_detect_recurring():
    txns = [
        make_txn(15, 15.99, "NETFLIX.COM", month=1),
        make_txn(15, 15.99, "NETFLIX.COM", month=2),
        make_txn(15, 15.99, "NETFLIX.COM", month=3),
    ]
    result = detect_recurring(txns)
    assert len(result) == 1
    assert result[0].frequency == Frequency.MONTHLY
    assert result[0].amount == 15.99


def test_detect_recurring_price_increase():
    txns = [
        make_txn(15, 9.99, "SPOTIFY", month=1),
        make_txn(15, 10.29, "SPOTIFY", month=2),
        make_txn(15, 10.49, "SPOTIFY", month=3),
    ]
    result = detect_recurring(txns)
    assert len(result) == 1
    assert result[0].price_trend == PriceTrend.INCREASED


def test_detect_recurring_single_transaction():
    txns = [make_txn(15, 15.99, "NETFLIX.COM", month=1)]
    result = detect_recurring(txns)
    assert len(result) == 0
