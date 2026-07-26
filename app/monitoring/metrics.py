from collections import defaultdict
from typing import Dict, List


class MetricsCollector:
    """Collects and aggregates metrics."""

    def __init__(self):
        self.counters: Dict[str, int] = defaultdict(int)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.gauges: Dict[str, float] = {}

    def record(self, name: str, value: float):
        """Record a metric value."""
        if isinstance(value, int):
            self.counters[name] += value
        else:
            self.histograms[name].append(value)
            self.gauges[name] = value

    def get_count(self, name: str) -> int:
        """Get counter value."""
        return self.counters.get(name, 0)

    def get_sum(self, name: str) -> float:
        """Get sum of histogram values."""
        return sum(self.histograms.get(name, []))

    def get_avg(self, name: str) -> float:
        """Get average of histogram values."""
        values = self.histograms.get(name, [])
        return sum(values) / len(values) if values else 0.0

    def get_gauge(self, name: str) -> float:
        """Get gauge value."""
        return self.gauges.get(name, 0.0)

    def get_all(self) -> Dict:
        """Get all metrics."""
        return {
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
        }
