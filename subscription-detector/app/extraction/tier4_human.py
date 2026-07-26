from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from datetime import datetime, timezone


@dataclass
class ReviewItem:
    transaction: Transaction
    reason: str
    added_at: datetime
    status: str = 'pending'  # 'pending' | 'reviewed' | 'approved' | 'rejected'
    reviewer_notes: str = ''


class HumanReviewQueue:
    """Manages queue of transactions needing human review."""

    def __init__(self):
        self.queue: List[ReviewItem] = []

    def add_to_queue(self, transaction: Transaction, reason: str) -> bool:
        """Add a transaction to the review queue."""
        item = ReviewItem(
            transaction=transaction,
            reason=reason,
            added_at=datetime.now(timezone.utc),
        )
        self.queue.append(item)
        return True

    def get_queue_size(self) -> int:
        """Get number of items in queue."""
        return len(self.queue)

    def get_pending_items(self) -> List[ReviewItem]:
        """Get all pending review items."""
        return [item for item in self.queue if item.status == 'pending']

    def approve_item(self, index: int, notes: str = '') -> bool:
        """Approve a review item."""
        if 0 <= index < len(self.queue):
            self.queue[index].status = 'approved'
            self.queue[index].reviewer_notes = notes
            return True
        return False

    def reject_item(self, index: int, notes: str = '') -> bool:
        """Reject a review item."""
        if 0 <= index < len(self.queue):
            self.queue[index].status = 'rejected'
            self.queue[index].reviewer_notes = notes
            return True
        return False
