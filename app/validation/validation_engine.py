from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from datetime import date


@dataclass
class ValidationIssue:
    transaction_id: str
    issue_type: str  # 'balance_mismatch' | 'future_date' | 'duplicate' | 'negative_amount'
    severity: str  # 'error' | 'warning' | 'info'
    message: str


@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue]
    checked_count: int
    issue_count: int


class ValidationEngine:
    """Validates extracted transactions."""

    def validate(self, transactions: List[Transaction]) -> ValidationResult:
        issues = []

        today = date.today()

        for txn in transactions:
            if txn.date > today:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='future_date',
                    severity='warning',
                    message=f'Transaction date {txn.date} is in the future',
                ))

        for txn in transactions:
            if txn.amount < 0:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='negative_amount',
                    severity='error',
                    message=f'Transaction has negative amount: {txn.amount}',
                ))

        seen = set()
        for txn in transactions:
            key = (txn.date, txn.amount, txn.description.upper())
            if key in seen:
                issues.append(ValidationIssue(
                    transaction_id=txn.id,
                    issue_type='duplicate',
                    severity='warning',
                    message='Possible duplicate transaction',
                ))
            seen.add(key)

        return ValidationResult(
            is_valid=all(i.severity != 'error' for i in issues),
            issues=issues,
            checked_count=len(transactions),
            issue_count=len(issues),
        )
