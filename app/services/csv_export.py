import csv
from io import StringIO
from typing import List
from app.models import Subscription, Transaction


def export_transactions_csv(transactions: List[Transaction]) -> str:
    """Generate CSV string for a list of transactions."""
    output = StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Transaction ID",
        "Date",
        "Description",
        "Amount",
        "Type",
        "Category",
        "Merchant",
        "Confidence Score",
        "Extraction Method"
    ])

    for txn in transactions:
        writer.writerow([
            txn.id,
            txn.date.isoformat() if hasattr(txn.date, 'isoformat') else str(txn.date),
            txn.description,
            f"{txn.amount:.2f}",
            getattr(txn, "transaction_type", "debit"),
            getattr(txn, "category", "other") or "other",
            getattr(txn, "merchant_normalized", "") or getattr(txn, "merchant", "") or "",
            f"{getattr(txn, 'confidence_score', 1.0):.2f}",
            getattr(txn, "extraction_method", "rules")
        ])

    return output.getvalue()


def export_subscriptions_csv(subscriptions: List[Subscription]) -> str:
    """Generate CSV string for a list of detected subscriptions."""
    output = StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "ID",
        "Merchant",
        "Amount",
        "Frequency",
        "Category",
        "Leak Score",
        "Action",
        "Confidence"
    ])

    for sub in subscriptions:
        writer.writerow([
            sub.id,
            sub.merchant,
            f"{sub.amount:.2f}",
            sub.frequency.value if hasattr(sub.frequency, 'value') else str(sub.frequency),
            sub.category.value if hasattr(sub.category, 'value') else str(sub.category),
            sub.leak_score,
            sub.action.value if hasattr(sub.action, 'value') else str(sub.action),
            f"{getattr(sub, 'confidence', 1.0):.2f}"
        ])

    return output.getvalue()
