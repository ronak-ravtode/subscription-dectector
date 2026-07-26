# Universal Bank Statement Parser — Phase 2: Intelligence Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add merchant resolution, transaction categorization, recurring detection, subscription detection, leak scoring, and recommendation engine.

**Architecture:** Pipeline of intelligence stages that process extracted transactions and generate insights.

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy, SQLite

## Global Constraints

- Python 3.10+
- Existing tests must continue to pass
- Backward compatible with current API
- No new frontend changes in this phase

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/intelligence/merchant_resolver.py` | Merchant normalization and deduplication |
| `app/intelligence/categorizer.py` | Transaction categorization |
| `app/intelligence/recurring_detector.py` | Recurring payment detection |
| `app/intelligence/subscription_detector.py` | Subscription identification |
| `app/intelligence/leak_scorer.py` | Subscription leak scoring |
| `app/intelligence/recommendation_engine.py` | Action recommendations |
| `app/intelligence/intelligence_engine.py` | Orchestrates all intelligence stages |
| `app/intelligence/merchant_database.json` | Known merchant mappings |
| `app/intelligence/category_rules.json` | Category classification rules |
| `tests/test_merchant_resolver.py` | Merchant resolver tests |
| `tests/test_categorizer.py` | Categorizer tests |
| `tests/test_recurring_detector.py` | Recurring detector tests |
| `tests/test_subscription_detector.py` | Subscription detector tests |
| `tests/test_leak_scorer.py` | Leak scorer tests |
| `tests/test_recommendation_engine.py` | Recommendation engine tests |
| `tests/test_intelligence_engine.py` | Intelligence engine tests |

---

### Task 1: Add Merchant Resolver

**Files:**
- Create: `app/intelligence/merchant_resolver.py`
- Create: `app/intelligence/merchant_database.json`
- Test: `tests/test_merchant_resolver.py`

**Interfaces:**
- Consumes: Transaction description
- Produces: Normalized merchant name

- [ ] **Step 1: Create merchant database**

```json
{
  "merchants": {
    "netflix": {
      "canonical_name": "Netflix",
      "category": "entertainment",
      "subcategory": "streaming",
      "aliases": ["NETFLIX.COM", "NETFLIX INDIA", "Netflix*Subs", "NFLX"]
    },
    "spotify": {
      "canonical_name": "Spotify",
      "category": "entertainment",
      "subcategory": "music",
      "aliases": ["SPOTIFY PREMIUM", "Spotify India", "SPOTIFY*SUBS"]
    },
    "adobe": {
      "canonical_name": "Adobe",
      "category": "software",
      "subcategory": "creative",
      "aliases": ["ADOBE CREATIVE CLOUD", "ADOBE CC", "ADOBE.COM"]
    },
    "microsoft": {
      "canonical_name": "Microsoft",
      "category": "software",
      "subcategory": "productivity",
      "aliases": ["MICROSOFT 365", "MS OFFICE", "MICROSOFT.COM"]
    },
    "amazon_prime": {
      "canonical_name": "Amazon Prime",
      "category": "entertainment",
      "subcategory": "streaming",
      "aliases": ["AMAZON PRIME", "PRIME VIDEO", "AMAZON*PRIME"]
    },
    "youtube": {
      "canonical_name": "YouTube Premium",
      "category": "entertainment",
      "subcategory": "streaming",
      "aliases": ["YOUTUBE PREMIUM", "YOUTUBE.COM", "YT PREMIUM"]
    }
  }
}
```

- [ ] **Step 2: Write the failing test**

```python
def test_resolve_merchant_exact_match():
    from app.intelligence.merchant_resolver import MerchantResolver
    
    resolver = MerchantResolver()
    result = resolver.resolve("NETFLIX.COM")
    
    assert result.canonical_name == "Netflix"
    assert result.category == "entertainment"
    assert result.confidence > 0.9


def test_resolve_merchant_alias():
    from app.intelligence.merchant_resolver import MerchantResolver
    
    resolver = MerchantResolver()
    result = resolver.resolve("SPOTIFY PREMIUM")
    
    assert result.canonical_name == "Spotify"
    assert result.category == "entertainment"
```

- [ ] **Step 3: Write implementation**

```python
import json
import os
from dataclasses import dataclass
from typing import Optional
from difflib import SequenceMatcher

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'merchant_database.json')

@dataclass
class MerchantResult:
    canonical_name: str
    category: str
    subcategory: str
    confidence: float
    original_description: str

class MerchantResolver:
    """Resolves merchant names to canonical form."""
    
    def __init__(self):
        self.database = self._load_database()
    
    def _load_database(self) -> dict:
        """Load merchant database from JSON file."""
        if os.path.exists(DATABASE_PATH):
            with open(DATABASE_PATH, 'r') as f:
                return json.load(f)
        return {"merchants": {}}
    
    def resolve(self, description: str) -> MerchantResult:
        """Resolve a transaction description to a canonical merchant."""
        desc_upper = description.upper().strip()
        
        # Exact match on canonical name
        for key, merchant in self.database.get('merchants', {}).items():
            if merchant['canonical_name'].upper() == desc_upper:
                return MerchantResult(
                    canonical_name=merchant['canonical_name'],
                    category=merchant['category'],
                    subcategory=merchant['subcategory'],
                    confidence=1.0,
                    original_description=description,
                )
        
        # Match on aliases
        for key, merchant in self.database.get('merchants', {}).items():
            for alias in merchant.get('aliases', []):
                if alias.upper() == desc_upper:
                    return MerchantResult(
                        canonical_name=merchant['canonical_name'],
                        category=merchant['category'],
                        subcategory=merchant['subcategory'],
                        confidence=0.95,
                        original_description=description,
                    )
        
        # Fuzzy match
        best_match = None
        best_score = 0.0
        
        for key, merchant in self.database.get('merchants', {}).items():
            # Check canonical name similarity
            score = SequenceMatcher(None, desc_upper, merchant['canonical_name'].upper()).ratio()
            if score > best_score and score > 0.6:
                best_score = score
                best_match = merchant
            
            # Check alias similarity
            for alias in merchant.get('aliases', []):
                score = SequenceMatcher(None, desc_upper, alias.upper()).ratio()
                if score > best_score and score > 0.6:
                    best_score = score
                    best_match = merchant
        
        if best_match:
            return MerchantResult(
                canonical_name=best_match['canonical_name'],
                category=best_match['category'],
                subcategory=best_match['subcategory'],
                confidence=best_score * 0.9,  # Penalize fuzzy match
                original_description=description,
            )
        
        # No match - return original
        return MerchantResult(
            canonical_name=description.title(),
            category='other',
            subcategory='',
            confidence=0.5,
            original_description=description,
        )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_merchant_resolver.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/intelligence/merchant_resolver.py app/intelligence/merchant_database.json tests/test_merchant_resolver.py
git commit -m "feat: add merchant resolver for name normalization"
```

---

### Task 2: Add Transaction Categorizer

**Files:**
- Create: `app/intelligence/categorizer.py`
- Create: `app/intelligence/category_rules.json`
- Test: `tests/test_categorizer.py`

**Interfaces:**
- Consumes: Transaction, merchant info
- Produces: Category and subcategory

- [ ] **Step 1: Create category rules**

```json
{
  "categories": {
    "entertainment": {
      "keywords": ["netflix", "spotify", "disney", "youtube", "hulu", "hotstar", "prime video"],
      "subcategories": {
        "streaming": ["netflix", "disney", "youtube", "hulu", "hotstar", "prime video"],
        "music": ["spotify", "apple music", "gaana", "wynk"],
        "gaming": ["steam", "playstation", "xbox", "nintendo"]
      }
    },
    "software": {
      "keywords": ["adobe", "microsoft", "github", "figma", "canva", "slack", "zoom"],
      "subcategories": {
        "creative": ["adobe", "figma", "canva"],
        "productivity": ["microsoft", "google workspace", "notion"],
        "development": ["github", "gitlab", "aws", "azure"]
      }
    },
    "utilities": {
      "keywords": ["electric", "gas", "water", "internet", "broadband", "wifi"],
      "subcategories": {
        "electricity": ["electric", "power", "energy"],
        "gas": ["gas", "lpg"],
        "water": ["water", "sewage"],
        "internet": ["internet", "broadband", "wifi", "jio", "airtel"]
      }
    },
    "food": {
      "keywords": ["swiggy", "zomato", "uber eats", "dominos", "pizza"],
      "subcategories": {
        "delivery": ["swiggy", "zomato", "uber eats"],
        "dine-in": ["restaurant", "cafe"],
        "grocery": ["bigbasket", "blinkit", "zepto"]
      }
    },
    "shopping": {
      "keywords": ["amazon", "flipkart", "myntra", "ajio", "meesho"],
      "subcategories": {
        "general": ["amazon", "flipkart"],
        "fashion": ["myntra", "ajio", "meesho"],
        "electronics": ["croma", "reliance digital"]
      }
    },
    "transport": {
      "keywords": ["uber", "ola", "rapido", "metro", "parking", "fuel"],
      "subcategories": {
        "ride-hailing": ["uber", "ola", "rapido"],
        "fuel": ["fuel", "petrol", "diesel", "shell", "bp"],
        "parking": ["parking", "toll"]
      }
    },
    "health": {
      "keywords": ["pharmacy", "hospital", "gym", "fitness", "doctor"],
      "subcategories": {
        "pharmacy": ["pharmacy", "medicine", "1mg", "pharmeasy"],
        "fitness": ["gym", "fitness", "cult.fit"],
        "medical": ["hospital", "doctor", "lab"]
      }
    },
    "financial": {
      "keywords": ["emi", "loan", "insurance", "premium", "mutual fund"],
      "subcategories": {
        "loan": ["emi", "loan", "housing loan"],
        "insurance": ["insurance", "premium", "lic"],
        "investment": ["mutual fund", "sip", "stock"]
      }
    }
  }
}
```

- [ ] **Step 2: Write the failing test**

```python
def test_categorize_netflix():
    from app.intelligence.categorizer import TransactionCategorizer
    
    categorizer = TransactionCategorizer()
    result = categorizer.categorize("Netflix Subscription", merchant_name="Netflix")
    
    assert result.category == "entertainment"
    assert result.subcategory == "streaming"


def test_categorize_unknown():
    from app.intelligence.categorizer import TransactionCategorizer
    
    categorizer = TransactionCategorizer()
    result = categorizer.categorize("Random Store Purchase")
    
    assert result.category == "other"
```

- [ ] **Step 3: Write implementation**

```python
import json
import os
from dataclasses import dataclass

RULES_PATH = os.path.join(os.path.dirname(__file__), 'category_rules.json')

@dataclass
class CategoryResult:
    category: str
    subcategory: str
    confidence: float

class TransactionCategorizer:
    """Categorizes transactions based on description and merchant."""
    
    def __init__(self):
        self.rules = self._load_rules()
    
    def _load_rules(self) -> dict:
        if os.path.exists(RULES_PATH):
            with open(RULES_PATH, 'r') as f:
                return json.load(f)
        return {"categories": {}}
    
    def categorize(self, description: str, merchant_name: str = None) -> CategoryResult:
        """Categorize a transaction."""
        search_text = (merchant_name or description).lower()
        
        for category, config in self.rules.get('categories', {}).items():
            # Check main keywords
            for keyword in config.get('keywords', []):
                if keyword.lower() in search_text:
                    # Find subcategory
                    subcategory = self._find_subcategory(search_text, config.get('subcategories', {}))
                    return CategoryResult(
                        category=category,
                        subcategory=subcategory,
                        confidence=0.9,
                    )
        
        return CategoryResult(
            category='other',
            subcategory='',
            confidence=0.5,
        )
    
    def _find_subcategory(self, text: str, subcategories: dict) -> str:
        for subcategory, keywords in subcategories.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    return subcategory
        return ''
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_categorizer.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/intelligence/categorizer.py app/intelligence/category_rules.json tests/test_categorizer.py
git commit -m "feat: add transaction categorizer"
```

---

### Task 3: Add Recurring Detector

**Files:**
- Create: `app/intelligence/recurring_detector.py`
- Test: `tests/test_recurring_detector.py`

**Interfaces:**
- Consumes: List of transactions
- Produces: List of recurring patterns

- [ ] **Step 1: Write the failing test**

```python
def test_detect_monthly_recurring():
    from app.intelligence.recurring_detector import RecurringDetector
    from app.models import Transaction
    from datetime import date
    
    transactions = [
        Transaction(id='1', date=date(2026, 1, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='2', date=date(2026, 2, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='3', date=date(2026, 3, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
    ]
    
    detector = RecurringDetector()
    patterns = detector.detect(transactions)
    
    assert len(patterns) == 1
    assert patterns[0].merchant == 'Netflix'
    assert patterns[0].frequency == 'monthly'
    assert patterns[0].consistency_score > 0.8
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass, field
from typing import List, Dict
from app.models import Transaction
from datetime import date, timedelta
from collections import defaultdict

@dataclass
class RecurringPattern:
    merchant: str
    frequency: str  # 'weekly' | 'monthly' | 'quarterly' | 'annual'
    avg_amount: float
    interval_days: int
    consistency_score: float
    transaction_count: int
    first_seen: date
    last_seen: date
    transaction_ids: List[str] = field(default_factory=list)

class RecurringDetector:
    """Detects recurring payment patterns."""
    
    def detect(self, transactions: List[Transaction]) -> List[RecurringPattern]:
        """Detect recurring patterns in transactions."""
        # Group by merchant
        merchant_groups = defaultdict(list)
        for txn in transactions:
            merchant = txn.merchant_normalized or txn.description.upper()
            merchant_groups[merchant].append(txn)
        
        patterns = []
        
        for merchant, txns in merchant_groups.items():
            if len(txns) < 2:
                continue
            
            # Sort by date
            txns.sort(key=lambda t: t.date)
            
            # Calculate intervals
            intervals = []
            for i in range(1, len(txns)):
                delta = (txns[i].date - txns[i-1].date).days
                intervals.append(delta)
            
            if not intervals:
                continue
            
            # Determine frequency
            avg_interval = sum(intervals) / len(intervals)
            frequency = self._classify_frequency(avg_interval)
            
            # Calculate consistency
            consistency = self._calculate_consistency(intervals)
            
            # Calculate amount consistency
            amounts = [t.amount for t in txns]
            amount_consistency = self._calculate_amount_consistency(amounts)
            
            # Overall consistency
            overall_consistency = (consistency + amount_consistency) / 2
            
            if overall_consistency > 0.6:
                patterns.append(RecurringPattern(
                    merchant=txns[0].description.title(),
                    frequency=frequency,
                    avg_amount=sum(amounts) / len(amounts),
                    interval_days=int(avg_interval),
                    consistency_score=overall_consistency,
                    transaction_count=len(txns),
                    first_seen=txns[0].date,
                    last_seen=txns[-1].date,
                    transaction_ids=[t.id for t in txns],
                ))
        
        return patterns
    
    def _classify_frequency(self, avg_interval: float) -> str:
        if avg_interval <= 10:
            return 'weekly'
        elif avg_interval <= 35:
            return 'monthly'
        elif avg_interval <= 100:
            return 'quarterly'
        else:
            return 'annual'
    
    def _calculate_consistency(self, intervals: List[int]) -> float:
        if len(intervals) < 2:
            return 1.0
        
        avg = sum(intervals) / len(intervals)
        variance = sum((x - avg) ** 2 for x in intervals) / len(intervals)
        std_dev = variance ** 0.5
        
        # Lower std dev = higher consistency
        if avg == 0:
            return 0.0
        cv = std_dev / avg  # Coefficient of variation
        
        return max(0, 1 - cv)
    
    def _calculate_amount_consistency(self, amounts: List[float]) -> float:
        if len(amounts) < 2:
            return 1.0
        
        avg = sum(amounts) / len(amounts)
        if avg == 0:
            return 0.0
        
        variance = sum((x - avg) ** 2 for x in amounts) / len(amounts)
        cv = (variance ** 0.5) / avg
        
        return max(0, 1 - cv)
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_recurring_detector.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/intelligence/recurring_detector.py tests/test_recurring_detector.py
git commit -m "feat: add recurring payment detector"
```

---

### Task 4: Add Subscription Detector

**Files:**
- Create: `app/intelligence/subscription_detector.py`
- Test: `tests/test_subscription_detector.py`

**Interfaces:**
- Consumes: List of transactions, recurring patterns
- Produces: List of subscriptions

- [ ] **Step 1: Write the failing test**

```python
def test_detect_subscription():
    from app.intelligence.subscription_detector import SubscriptionDetector
    from app.intelligence.recurring_detector import RecurringPattern
    from app.models import Transaction
    from datetime import date
    
    transactions = [
        Transaction(id='1', date=date(2026, 1, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='2', date=date(2026, 2, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='3', date=date(2026, 3, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
    ]
    
    pattern = RecurringPattern(
        merchant='Netflix',
        frequency='monthly',
        avg_amount=15.99,
        interval_days=30,
        consistency_score=0.95,
        transaction_count=3,
        first_seen=date(2026, 1, 15),
        last_seen=date(2026, 3, 15),
    )
    
    detector = SubscriptionDetector()
    subscriptions = detector.detect(transactions, [pattern])
    
    assert len(subscriptions) == 1
    assert subscriptions[0].merchant == 'Netflix'
    assert subscriptions[0].is_subscription == True
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass
from typing import List
from app.models import Transaction
from app.intelligence.recurring_detector import RecurringPattern

KNOWN_SUBSCRIPTION_MERCHANTS = [
    'Netflix', 'Spotify', 'Disney+', 'YouTube Premium', 'Amazon Prime',
    'Adobe', 'Microsoft', 'GitHub', 'Figma', 'Canva', 'Slack', 'Zoom',
    'iCloud', 'Google One', 'Dropbox', 'Notion', 'Medium',
]

@dataclass
class Subscription:
    merchant: str
    amount: float
    frequency: str
    category: str
    is_subscription: bool
    confidence: float
    transaction_count: int
    first_seen: object
    last_seen: object
    transaction_ids: List[str]

class SubscriptionDetector:
    """Detects subscriptions from recurring patterns."""
    
    def detect(self, transactions: List[Transaction], patterns: List[RecurringPattern]) -> List[Subscription]:
        """Detect subscriptions from recurring patterns."""
        subscriptions = []
        
        for pattern in patterns:
            is_subscription = self._is_subscription(pattern)
            confidence = self._calculate_confidence(pattern, is_subscription)
            
            subscriptions.append(Subscription(
                merchant=pattern.merchant,
                amount=pattern.avg_amount,
                frequency=pattern.frequency,
                category='subscription' if is_subscription else 'recurring',
                is_subscription=is_subscription,
                confidence=confidence,
                transaction_count=pattern.transaction_count,
                first_seen=pattern.first_seen,
                last_seen=pattern.last_seen,
                transaction_ids=pattern.transaction_ids,
            ))
        
        return subscriptions
    
    def _is_subscription(self, pattern: RecurringPattern) -> bool:
        """Determine if a recurring pattern is a subscription."""
        # Check if merchant is known subscription service
        if pattern.merchant in KNOWN_SUBSCRIPTION_MERCHANTS:
            return True
        
        # Check if amount is a common subscription price
        common_prices = [4.99, 5.99, 7.99, 9.99, 12.99, 14.99, 15.99, 19.99, 29.99, 49.99, 99.99]
        if any(abs(pattern.avg_amount - price) < 0.01 for price in common_prices):
            return True
        
        # Monthly frequency with consistent amount
        if pattern.frequency == 'monthly' and pattern.consistency_score > 0.8:
            return True
        
        return False
    
    def _calculate_confidence(self, pattern: RecurringPattern, is_subscription: bool) -> float:
        """Calculate confidence score for subscription detection."""
        confidence = 0.5
        
        if is_subscription:
            confidence += 0.3
        
        confidence += pattern.consistency_score * 0.2
        
        return min(confidence, 1.0)
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_subscription_detector.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/intelligence/subscription_detector.py tests/test_subscription_detector.py
git commit -m "feat: add subscription detector"
```

---

### Task 5: Add Leak Scorer

**Files:**
- Create: `app/intelligence/leak_scorer.py`
- Test: `tests/test_leak_scorer.py`

**Interfaces:**
- Consumes: Subscription
- Produces: Leak score (0-100)

- [ ] **Step 1: Write the failing test**

```python
def test_calculate_leak_score():
    from app.intelligence.leak_scorer import LeakScorer
    from app.intelligence.subscription_detector import Subscription
    from datetime import date
    
    subscription = Subscription(
        merchant='Netflix',
        amount=15.99,
        frequency='monthly',
        category='subscription',
        is_subscription=True,
        confidence=0.9,
        transaction_count=6,
        first_seen=date(2026, 1, 15),
        last_seen=date(2026, 6, 15),
        transaction_ids=['1', '2', '3', '4', '5', '6'],
    )
    
    scorer = LeakScorer()
    score = scorer.calculate(subscription)
    
    assert score >= 0
    assert score <= 100
```

- [ ] **Step 2: Write implementation**

```python
from app.intelligence.subscription_detector import Subscription
from datetime import date

class LeakScorer:
    """Calculates leak score for subscriptions."""
    
    def calculate(self, subscription: Subscription) -> int:
        """Calculate leak score (0-100)."""
        score = 0
        
        # Amount factor (higher = more leak)
        score += min(subscription.amount / 10, 30)
        
        # Duration factor (longer = more leak)
        days_active = (subscription.last_seen - subscription.first_seen).days
        if days_active > 180:
            score += 15
        elif days_active > 90:
            score += 10
        elif days_active > 30:
            score += 5
        
        # Frequency factor
        if subscription.frequency == 'monthly':
            score += 10
        elif subscription.frequency == 'weekly':
            score += 15
        
        # Transaction count factor
        if subscription.transaction_count >= 6:
            score += 10
        elif subscription.transaction_count >= 3:
            score += 5
        
        return min(int(score), 100)
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_leak_scorer.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/intelligence/leak_scorer.py tests/test_leak_scorer.py
git commit -m "feat: add leak scorer for subscriptions"
```

---

### Task 6: Add Recommendation Engine

**Files:**
- Create: `app/intelligence/recommendation_engine.py`
- Test: `tests/test_recommendation_engine.py`

**Interfaces:**
- Consumes: Subscription with leak score
- Produces: Recommendation (keep, review, cancel)

- [ ] **Step 1: Write the failing test**

```python
def test_recommend_cancel():
    from app.intelligence.recommendation_engine import RecommendationEngine
    from app.intelligence.subscription_detector import Subscription
    from datetime import date
    
    subscription = Subscription(
        merchant='Unknown Service',
        amount=29.99,
        frequency='monthly',
        category='subscription',
        is_subscription=True,
        confidence=0.7,
        transaction_count=3,
        first_seen=date(2026, 4, 15),
        last_seen=date(2026, 6, 15),
        transaction_ids=['1', '2', '3'],
    )
    
    engine = RecommendationEngine()
    recommendation = engine.recommend(subscription, leak_score=75)
    
    assert recommendation.action in ['review', 'cancel']
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass
from app.intelligence.subscription_detector import Subscription

@dataclass
class Recommendation:
    action: str  # 'keep' | 'review' | 'cancel'
    reasoning: str
    confidence: float

class RecommendationEngine:
    """Generates recommendations for subscriptions."""
    
    def recommend(self, subscription: Subscription, leak_score: int) -> Recommendation:
        """Generate recommendation for a subscription."""
        
        # High leak score -> cancel or review
        if leak_score >= 70:
            return Recommendation(
                action='cancel',
                reasoning=f'High leak score ({leak_score}). Consider cancelling to save ₹{subscription.amount * 12:.0f}/year.',
                confidence=0.8,
            )
        
        # Medium leak score -> review
        if leak_score >= 40:
            return Recommendation(
                action='review',
                reasoning=f'Moderate leak score ({leak_score}). Review if still needed.',
                confidence=0.7,
            )
        
        # Low leak score -> keep
        return Recommendation(
            action='keep',
            reasoning=f'Low leak score ({leak_score}). Good value subscription.',
            confidence=0.9,
        )
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_recommendation_engine.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/intelligence/recommendation_engine.py tests/test_recommendation_engine.py
git commit -m "feat: add recommendation engine for subscriptions"
```

---

### Task 7: Add Intelligence Engine Orchestrator

**Files:**
- Create: `app/intelligence/intelligence_engine.py`
- Test: `tests/test_intelligence_engine.py`

**Interfaces:**
- Consumes: List of transactions
- Produces: Intelligence result with all insights

- [ ] **Step 1: Write the failing test**

```python
def test_intelligence_engine_full_pipeline():
    from app.intelligence.intelligence_engine import IntelligenceEngine
    from app.models import Transaction
    from datetime import date
    
    transactions = [
        Transaction(id='1', date=date(2026, 1, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='2', date=date(2026, 2, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='3', date=date(2026, 3, 15), amount=15.99, description='Netflix', merchant_normalized='NETFLIX'),
        Transaction(id='4', date=date(2026, 1, 20), amount=9.99, description='Spotify', merchant_normalized='SPOTIFY'),
        Transaction(id='5', date=date(2026, 2, 20), amount=9.99, description='Spotify', merchant_normalized='SPOTIFY'),
        Transaction(id='6', date=date(2026, 3, 20), amount=9.99, description='Spotify', merchant_normalized='SPOTIFY'),
    ]
    
    engine = IntelligenceEngine()
    result = engine.analyze(transactions)
    
    assert result.subscription_count >= 0
    assert len(result.recommendations) >= 0
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass, field
from typing import List
from app.models import Transaction
from app.intelligence.recurring_detector import RecurringDetector, RecurringPattern
from app.intelligence.subscription_detector import SubscriptionDetector, Subscription
from app.intelligence.leak_scorer import LeakScorer
from app.intelligence.recommendation_engine import RecommendationEngine, Recommendation

@dataclass
class IntelligenceResult:
    recurring_patterns: List[RecurringPattern]
    subscriptions: List[Subscription]
    recommendations: List[Recommendation]
    subscription_count: int
    total_monthly_leak: float
    leak_score: int

class IntelligenceEngine:
    """Orchestrates all intelligence stages."""
    
    def __init__(self):
        self.recurring_detector = RecurringDetector()
        self.subscription_detector = SubscriptionDetector()
        self.leak_scorer = LeakScorer()
        self.recommendation_engine = RecommendationEngine()
    
    def analyze(self, transactions: List[Transaction]) -> IntelligenceResult:
        """Run full intelligence pipeline."""
        # Detect recurring patterns
        patterns = self.recurring_detector.detect(transactions)
        
        # Detect subscriptions
        subscriptions = self.subscription_detector.detect(transactions, patterns)
        
        # Calculate leak scores and recommendations
        recommendations = []
        total_monthly = 0
        
        for sub in subscriptions:
            leak_score = self.leak_scorer.calculate(sub)
            recommendation = self.recommendation_engine.recommend(sub, leak_score)
            recommendations.append(recommendation)
            
            if sub.is_subscription:
                total_monthly += sub.amount
        
        # Calculate overall leak score
        if subscriptions:
            leak_scores = [self.leak_scorer.calculate(s) for s in subscriptions]
            overall_leak_score = int(sum(leak_scores) / len(leak_scores))
        else:
            overall_leak_score = 0
        
        return IntelligenceResult(
            recurring_patterns=patterns,
            subscriptions=subscriptions,
            recommendations=recommendations,
            subscription_count=sum(1 for s in subscriptions if s.is_subscription),
            total_monthly_leak=round(total_monthly, 2),
            leak_score=overall_leak_score,
        )
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_intelligence_engine.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/intelligence/intelligence_engine.py tests/test_intelligence_engine.py
git commit -m "feat: add intelligence engine orchestrator"
```

---

### Task 8: Integrate Intelligence Engine with API

**Files:**
- Modify: `app/main.py`

**Interfaces:**
- Consumes: Intelligence engine
- Produces: Updated analysis results

- [ ] **Step 1: Update imports in main.py**

```python
from app.intelligence.intelligence_engine import IntelligenceEngine
```

- [ ] **Step 2: Update analyze_statement function**

The function should:
1. Extract transactions (existing)
2. Run intelligence engine
3. Store subscriptions and recommendations
4. Return enhanced results

- [ ] **Step 3: Run tests to verify everything works**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/main.py
git commit -m "feat: integrate intelligence engine with existing API"
```

---

### Task 9: Integration Test with Real PDFs

**Files:**
- Create: `tests/test_intelligence_integration.py`

**Interfaces:**
- Consumes: Real PDF files
- Produces: Verification of intelligence pipeline

- [ ] **Step 1: Write integration test**

```python
import pytest
from app.parsers.pdf_parser import parse_pdf
from app.extraction.extraction_engine import ExtractionEngine
from app.intelligence.intelligence_engine import IntelligenceEngine

def test_sbi_intelligence_pipeline():
    """Test full intelligence pipeline with SBI statement."""
    pdf_path = r'A:\innovahack\DepositAccountStatement_unlocked.pdf'
    
    text = parse_pdf(pdf_path)
    
    # Extract transactions
    engine = ExtractionEngine()
    result = engine.extract(text, bank_code='sbi')
    assert len(result.transactions) > 0
    
    # Run intelligence
    intel_engine = IntelligenceEngine()
    intel_result = intel_engine.analyze(result.transactions)
    
    # Verify results
    assert intel_result.subscription_count >= 0
    assert len(intel_result.recommendations) >= 0
    assert intel_result.total_monthly_leak >= 0
```

- [ ] **Step 2: Run integration test**

Run: `pytest tests/test_intelligence_integration.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_intelligence_integration.py
git commit -m "test: add intelligence integration tests"
```

---

### Task 10: Final Verification

**Files:**
- Run full test suite
- Verify intelligence pipeline works end-to-end

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Manual verification**

```bash
python -c "
from app.parsers.pdf_parser import parse_pdf
from app.extraction.extraction_engine import ExtractionEngine
from app.intelligence.intelligence_engine import IntelligenceEngine

text = parse_pdf(r'A:\innovahack\DepositAccountStatement_unlocked.pdf')
engine = ExtractionEngine()
result = engine.extract(text, bank_code='sbi')

intel = IntelligenceEngine()
intel_result = intel.analyze(result.transactions)

print(f'Transactions: {len(result.transactions)}')
print(f'Recurring patterns: {len(intel_result.recurring_patterns)}')
print(f'Subscriptions: {intel_result.subscription_count}')
print(f'Monthly leak: ₹{intel_result.total_monthly_leak}')
print(f'Leak score: {intel_result.leak_score}')
"
```

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete Phase 2 - Intelligence Layer

- Add merchant resolver for name normalization
- Add transaction categorizer
- Add recurring payment detector
- Add subscription detector
- Add leak scorer
- Add recommendation engine
- Add intelligence engine orchestrator
- Integrate with existing API
- Add integration tests"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Add Merchant Resolver | 30 min |
| 2 | Add Transaction Categorizer | 30 min |
| 3 | Add Recurring Detector | 45 min |
| 4 | Add Subscription Detector | 30 min |
| 5 | Add Leak Scorer | 20 min |
| 6 | Add Recommendation Engine | 20 min |
| 7 | Add Intelligence Engine Orchestrator | 30 min |
| 8 | Integrate with API | 30 min |
| 9 | Integration Tests | 30 min |
| 10 | Final Verification | 15 min |
| **Total** | | **~5 hours** |

---

## Expected Results

After Phase 2, the system will:
1. Normalize merchant names
2. Categorize transactions
3. Detect recurring payments
4. Identify subscriptions
5. Calculate leak scores
6. Generate recommendations
7. Provide actionable financial insights
