import uuid
from typing import List, Dict
from datetime import date
from difflib import SequenceMatcher
from app.models import Transaction, Subscription, Frequency, PriceTrend
from app.extractors.transaction_extractor import categorize_transaction


def similar(a: str, b: str) -> float:
    """Calculate string similarity ratio."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def group_by_merchant(transactions: List[Transaction]) -> Dict[str, List[Transaction]]:
    """Group similar merchant names using fuzzy matching."""
    if not transactions:
        return {}

    sorted_txns = sorted(transactions, key=lambda x: x.date)
    groups: Dict[str, List[Transaction]] = {}
    assigned = set()

    for i, txn in enumerate(sorted_txns):
        if i in assigned:
            continue

        group_key = txn.description
        groups[group_key] = [txn]
        assigned.add(i)

        for j in range(i + 1, len(sorted_txns)):
            if j in assigned:
                continue
            other = sorted_txns[j]
            if similar(txn.description, other.description) > 0.6:
                groups[group_key].append(other)
                assigned.add(j)

    return groups


def calculate_frequency(transactions: List[Transaction]) -> Frequency:
    """Determine if weekly/monthly/quarterly/annual based on transaction dates."""
    if len(transactions) < 2:
        return Frequency.MONTHLY

    sorted_txns = sorted(transactions, key=lambda x: x.date)
    days_between = []

    for i in range(1, len(sorted_txns)):
        delta = (sorted_txns[i].date - sorted_txns[i - 1].date).days
        days_between.append(delta)

    if not days_between:
        return Frequency.MONTHLY

    avg_days = sum(days_between) / len(days_between)

    if avg_days <= 10:
        return Frequency.WEEKLY
    elif avg_days <= 35:
        return Frequency.MONTHLY
    elif avg_days <= 100:
        return Frequency.QUARTERLY
    else:
        return Frequency.ANNUAL


def check_amount_consistency(amounts: List[float], tolerance: float = 0.50) -> bool:
    """Check if amounts are within ±50% tolerance.
    
    Uses a generous tolerance to allow for price increases (a key feature
    of subscription detection). Filters out completely unrelated transactions
    while preserving legitimate subscription patterns with price changes.
    """
    if len(amounts) < 2:
        return True

    avg = sum(amounts) / len(amounts)
    if avg == 0:
        return False

    for amount in amounts:
        deviation = abs(amount - avg) / avg
        if deviation > tolerance:
            return False

    return True


def detect_price_trend(amounts: List[float]) -> PriceTrend:
    """Detect if prices are stable/increased/decreased."""
    if len(amounts) < 2:
        return PriceTrend.STABLE

    sorted_amounts = amounts
    first_half = sorted_amounts[:len(sorted_amounts) // 2]
    second_half = sorted_amounts[len(sorted_amounts) // 2:]

    avg_first = sum(first_half) / len(first_half) if first_half else 0
    avg_second = sum(second_half) / len(second_half) if second_half else 0

    if avg_first == 0:
        return PriceTrend.STABLE

    change_pct = (avg_second - avg_first) / avg_first

    if change_pct > 0.03:
        return PriceTrend.INCREASED
    elif change_pct < -0.03:
        return PriceTrend.DECREASED
    else:
        return PriceTrend.STABLE


def count_price_increases(amounts: List[float]) -> int:
    """Count the number of times the price increased."""
    increases = 0
    for i in range(1, len(amounts)):
        if amounts[i] > amounts[i - 1] * 1.02:
            increases += 1
    return increases


def calculate_duration_months(transactions: List[Transaction]) -> int:
    """Calculate duration in months from first to last transaction."""
    if not transactions:
        return 0

    sorted_txns = sorted(transactions, key=lambda x: x.date)
    first_date = sorted_txns[0].date
    last_date = sorted_txns[-1].date

    months = (last_date.year - first_date.year) * 12 + (last_date.month - first_date.month)
    return max(1, months)


from app.extractors.transaction_extractor import categorize_transaction, is_person_transfer


def detect_recurring(transactions: List[Transaction]) -> List[Subscription]:
    """Group transactions and detect recurring patterns."""
    if not transactions:
        return []

    groups = group_by_merchant(transactions)
    subscriptions = []

    for merchant, txns in groups.items():
        if not merchant or merchant.upper() == "UNKNOWN" or not merchant.strip():
            continue
        if is_person_transfer(merchant):
            continue
        if len(txns) < 2:
            continue

        amounts = [t.amount for t in txns]
        avg_amount = sum(amounts) / len(amounts)
        if avg_amount < 1.0:
            continue

        if not check_amount_consistency(amounts):
            continue

        frequency = calculate_frequency(txns)
        price_trend = detect_price_trend(amounts)
        price_increases = count_price_increases(amounts)
        duration_months = calculate_duration_months(txns)
        avg_amount = sum(amounts) / len(amounts)

        category = categorize_transaction(merchant)

        subscriptions.append(Subscription(
            id=str(uuid.uuid4()),
            merchant=merchant,
            amount=round(avg_amount, 2),
            frequency=frequency,
            category=category,
            price_trend=price_trend,
            duration_months=duration_months,
            price_increases=price_increases,
        ))

        for txn in txns:
            txn.is_recurring = True

    return subscriptions
