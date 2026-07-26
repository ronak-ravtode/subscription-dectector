import time
from collections import defaultdict
from typing import Dict, List


class RateLimiter:
    """Sliding window rate limiter."""

    def __init__(self, max_requests: int = 100, window_seconds: int = 3600):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed."""
        now = time.time()
        cutoff = now - self.window_seconds

        # Remove old requests
        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        # Check limit
        if len(self.requests[key]) >= self.max_requests:
            return False

        # Record request
        self.requests[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        """Get remaining requests for key."""
        now = time.time()
        cutoff = now - self.window_seconds

        self.requests[key] = [t for t in self.requests[key] if t > cutoff]

        return max(0, self.max_requests - len(self.requests[key]))

    def reset(self, key: str):
        """Reset rate limit for key."""
        self.requests[key] = []
