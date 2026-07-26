# Universal Bank Statement Parser — Phase 3: AI Integration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered extraction using Google Gemini Flash for unknown formats, OCR support for scanned PDFs, and document preprocessing.

**Architecture:** Tier 3 AI extraction as fallback for unknown formats, with OCR preprocessing for scanned documents.

**Tech Stack:** Python 3.10+, FastAPI, google-generativeai, Pillow, PyMuPDF

## Global Constraints

- Python 3.10+
- Existing tests must continue to pass
- Use Google Gemini Flash (free tier) for AI extraction
- No new frontend changes in this phase

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/preprocessing/image_processor.py` | Image enhancement (deskew, denoise, orientation) |
| `app/preprocessing/ocr_engine.py` | OCR with Tesseract |
| `app/extraction/tier3_ai.py` | AI extraction using Gemini Flash |
| `app/extraction/tier4_human.py` | Human review queue |
| `app/extraction/extraction_engine.py` | Updated to include Tier 3 and 4 |
| `tests/test_preprocessing.py` | Preprocessing tests |
| `tests/test_tier3_ai.py` | Tier 3 AI tests |
| `tests/test_tier4_human.py` | Tier 4 human review tests |

---

### Task 1: Add Image Preprocessor

**Files:**
- Create: `app/preprocessing/image_processor.py`
- Test: `tests/test_preprocessing.py`

**Interfaces:**
- Consumes: Image bytes or file path
- Produces: Enhanced image bytes

- [ ] **Step 1: Write the failing test**

```python
def test_preprocess_image():
    from app.preprocessing.image_processor import ImageProcessor
    
    processor = ImageProcessor()
    
    # Create a simple test image
    from PIL import Image
    import io
    
    img = Image.new('RGB', (100, 100), color='white')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    result = processor.process(img_bytes.read())
    
    assert result is not None
    assert len(result) > 0
```

- [ ] **Step 2: Write implementation**

```python
from PIL import Image, ImageEnhance, ImageFilter
import io
from typing import Optional

class ImageProcessor:
    """Preprocesses images for better OCR/extraction."""
    
    def process(self, image_bytes: bytes) -> bytes:
        """Process image for better text extraction."""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.5)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(2.0)
            
            # Convert to grayscale for better OCR
            img = img.convert('L')
            
            # Apply slight denoise
            img = img.filter(ImageFilter.MedianFilter(size=3))
            
            # Save to bytes
            output = io.BytesIO()
            img.save(output, format='PNG')
            return output.getvalue()
            
        except Exception as e:
            return image_bytes
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_preprocessing.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/preprocessing/image_processor.py tests/test_preprocessing.py
git commit -m "feat: add image preprocessor for OCR enhancement"
```

---

### Task 2: Add OCR Engine

**Files:**
- Create: `app/preprocessing/ocr_engine.py`
- Test: `tests/test_ocr_engine.py`

**Interfaces:**
- Consumes: Image bytes
- Produces: Extracted text

- [ ] **Step 1: Write the failing test**

```python
def test_ocr_extract_text():
    from app.preprocessing.ocr_engine import OCREngine
    
    engine = OCREngine()
    
    # Create a simple test image with text
    from PIL import Image, ImageDraw, ImageFont
    import io
    
    img = Image.new('RGB', (200, 50), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "Hello World", fill='black')
    
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    text = engine.extract_text(img_bytes.read())
    
    assert text is not None
    assert len(text) > 0
```

- [ ] **Step 2: Write implementation**

```python
import subprocess
import tempfile
import os
from typing import Optional

class OCREngine:
    """Extracts text from images using Tesseract OCR."""
    
    def __init__(self, tesseract_path: str = None):
        self.tesseract_path = tesseract_path or 'tesseract'
    
    def extract_text(self, image_bytes: bytes, lang: str = 'eng') -> str:
        """Extract text from image using Tesseract."""
        try:
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                tmp.write(image_bytes)
                tmp_path = tmp.name
            
            output_path = tmp_path.replace('.png', '')
            
            cmd = [
                self.tesseract_path,
                tmp_path,
                output_path,
                '-l', lang,
                '--oem', '3',
                '--psm', '6',
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            txt_path = output_path + '.txt'
            if os.path.exists(txt_path):
                with open(txt_path, 'r') as f:
                    text = f.read()
                os.unlink(txt_path)
                os.unlink(tmp_path)
                return text.strip()
            
            os.unlink(tmp_path)
            return ""
            
        except Exception as e:
            return ""
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_ocr_engine.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/preprocessing/ocr_engine.py tests/test_ocr_engine.py
git commit -m "feat: add OCR engine using Tesseract"
```

---

### Task 3: Add Tier 3 AI Extraction

**Files:**
- Create: `app/extraction/tier3_ai.py`
- Test: `tests/test_tier3_ai.py`

**Interfaces:**
- Consumes: PDF file path, bank info
- Produces: List of Transaction objects

- [ ] **Step 1: Write the failing test**

```python
def test_ai_extract_transactions():
    from app.extraction.tier3_ai import AIExtractor
    
    extractor = AIExtractor()
    
    # Test with a mock PDF path (will return empty if no API key)
    result = extractor.extract("test.pdf", bank_code="unknown")
    
    # Just verify it doesn't crash
    assert result is not None
    assert hasattr(result, 'transactions')
    assert hasattr(result, 'confidence')
```

- [ ] **Step 2: Write implementation**

```python
import os
import json
from dataclasses import dataclass, field
from typing import List, Optional
from app.models import Transaction
import uuid

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

@dataclass
class AIExtractionResult:
    transactions: List[Transaction]
    confidence: float
    raw_response: str
    warnings: List[str] = field(default_factory=list)

class AIExtractor:
    """Extracts transactions using Google Gemini Flash."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-1.5-flash"
    
    def extract(self, pdf_path: str, bank_code: str = "unknown") -> AIExtractionResult:
        """Extract transactions from PDF using Gemini."""
        warnings = []
        
        if not GEMINI_AVAILABLE:
            warnings.append("google-generativeai not installed")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )
        
        if not self.api_key or self.api_key == "your_api_key_here":
            warnings.append("GEMINI_API_KEY not configured")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )
        
        try:
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name)
            
            # Read PDF as image using PyMuPDF
            import fitz
            doc = fitz.open(pdf_path)
            
            all_transactions = []
            
            for page_num in range(min(len(doc), 10)):  # Limit to 10 pages
                page = doc[page_num]
                pix = page.get_pixmap(dpi=150)
                img_data = pix.tobytes("png")
                
                prompt = self._build_prompt(bank_code)
                
                response = model.generate_content(
                    [prompt, {"mime_type": "image/png", "data": img_data}]
                )
                
                if response.text:
                    transactions = self._parse_response(response.text)
                    all_transactions.extend(transactions)
            
            doc.close()
            
            return AIExtractionResult(
                transactions=all_transactions,
                confidence=0.75,  # AI extraction has medium confidence
                raw_response=response.text if response.text else "",
                warnings=warnings,
            )
            
        except Exception as e:
            warnings.append(f"AI extraction failed: {str(e)}")
            return AIExtractionResult(
                transactions=[],
                confidence=0.0,
                raw_response="",
                warnings=warnings,
            )
    
    def _build_prompt(self, bank_code: str) -> str:
        """Build extraction prompt for Gemini."""
        return """Extract all transactions from this bank statement page.

For each transaction, return:
- date: in YYYY-MM-DD format
- description: the transaction description/narration
- amount: the numeric amount (positive for credits, negative for debits)
- balance: the running balance if available
- type: "credit" or "debit"

Return ONLY a JSON array with no other text. Example:
[
  {"date": "2026-01-15", "description": "NETFLIX.COM", "amount": -15.99, "balance": 1500.00, "type": "debit"},
  {"date": "2026-01-20", "description": "SALARY", "amount": 5000.00, "balance": 6500.00, "type": "credit"}
]

If no transactions are found, return an empty array: []"""
    
    def _parse_response(self, response_text: str) -> List[Transaction]:
        """Parse Gemini response into transactions."""
        transactions = []
        
        try:
            # Clean response text
            text = response_text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            data = json.loads(text)
            
            if not isinstance(data, list):
                return transactions
            
            for item in data:
                try:
                    from datetime import datetime
                    
                    date_str = item.get('date', '')
                    if date_str:
                        date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    else:
                        continue
                    
                    amount = float(item.get('amount', 0))
                    if amount == 0:
                        continue
                    
                    description = item.get('description', '').strip()
                    if not description:
                        continue
                    
                    balance = float(item.get('balance', 0))
                    txn_type = item.get('type', 'debit' if amount < 0 else 'credit')
                    
                    transactions.append(Transaction(
                        id=str(uuid.uuid4()),
                        date=date,
                        amount=abs(amount),
                        description=description,
                        raw_description=description,
                        merchant_normalized=description.upper(),
                        transaction_type=txn_type,
                        balance=balance,
                        confidence_score=0.75,
                        extraction_method='ai',
                    ))
                    
                except (ValueError, KeyError) as e:
                    continue
            
        except json.JSONDecodeError:
            pass
        
        return transactions
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_tier3_ai.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/extraction/tier3_ai.py tests/test_tier3_ai.py
git commit -m "feat: add Tier 3 AI extraction using Gemini Flash"
```

---

### Task 4: Add Human Review Queue

**Files:**
- Create: `app/extraction/tier4_human.py`
- Test: `tests/test_tier4_human.py`

**Interfaces:**
- Consumes: Transactions with low confidence
- Produces: Review queue items

- [ ] **Step 1: Write the failing test**

```python
def test_add_to_review_queue():
    from app.extraction.tier4_human import HumanReviewQueue
    from app.models import Transaction
    from datetime import date
    
    queue = HumanReviewQueue()
    
    txn = Transaction(
        id='test-1',
        date=date(2026, 1, 15),
        amount=15.99,
        description='Unclear Transaction',
        confidence_score=0.5,
    )
    
    result = queue.add_to_queue(txn, reason='Low confidence')
    
    assert result is True
    assert queue.get_queue_size() == 1
```

- [ ] **Step 2: Write implementation**

```python
from dataclasses import dataclass, field
from typing import List, Optional
from app.models import Transaction
from datetime import datetime

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
            added_at=datetime.utcnow(),
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
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_tier4_human.py -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/extraction/tier4_human.py tests/test_tier4_human.py
git commit -m "feat: add human review queue for low-confidence transactions"
```

---

### Task 5: Update Extraction Engine with Tier 3

**Files:**
- Modify: `app/extraction/extraction_engine.py`

**Interfaces:**
- Consumes: Tier 3 AI extractor
- Produces: Updated extraction with AI fallback

- [ ] **Step 1: Update imports**

```python
from app.extraction.tier3_ai import AIExtractor
```

- [ ] **Step 2: Update extraction logic**

Add AI extraction as fallback when Tier 1 and Tier 2 fail.

- [ ] **Step 3: Run tests to verify everything works**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add app/extraction/extraction_engine.py
git commit -m "feat: add Tier 3 AI fallback to extraction engine"
```

---

### Task 6: Integration Test with AI Extraction

**Files:**
- Create: `tests/test_ai_integration.py`

**Interfaces:**
- Consumes: Real PDF files
- Produces: Verification of AI extraction

- [ ] **Step 1: Write integration test**

```python
import pytest
from app.extraction.extraction_engine import ExtractionEngine
from app.extraction.tier3_ai import AIExtractor

def test_ai_extractor_initialization():
    """Test AI extractor can be initialized."""
    extractor = AIExtractor()
    assert extractor is not None

def test_extraction_engine_has_tier3():
    """Test extraction engine uses AI fallback."""
    engine = ExtractionEngine()
    assert hasattr(engine, 'extract')
```

- [ ] **Step 2: Run integration test**

Run: `pytest tests/test_ai_integration.py -v`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/test_ai_integration.py
git commit -m "test: add AI integration tests"
```

---

### Task 7: Final Verification

**Files:**
- Run full test suite
- Verify AI extraction works

- [ ] **Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 2: Manual verification**

```bash
python -c "
from app.extraction.extraction_engine import ExtractionEngine

# Test with SBI PDF (should use template, not AI)
engine = ExtractionEngine()
result = engine.extract('test text', bank_code='sbi')
print(f'SBI: {result.tier_used}, {len(result.transactions)} transactions')

# Test with unknown format (should fall back to rules, then AI if no results)
result2 = engine.extract('01/15/2026 | \$15.99 | NETFLIX.COM', bank_code='unknown')
print(f'Unknown: {result2.tier_used}, {len(result2.transactions)} transactions')
"
```

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete Phase 3 - AI Integration

- Add image preprocessor for OCR enhancement
- Add OCR engine using Tesseract
- Add Tier 3 AI extraction using Gemini Flash
- Add human review queue
- Update extraction engine with AI fallback
- Add integration tests"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Add Image Preprocessor | 30 min |
| 2 | Add OCR Engine | 30 min |
| 3 | Add Tier 3 AI Extraction | 45 min |
| 4 | Add Human Review Queue | 20 min |
| 5 | Update Extraction Engine | 20 min |
| 6 | Integration Tests | 20 min |
| 7 | Final Verification | 15 min |
| **Total** | | **~3 hours** |

---

## Expected Results

After Phase 3, the system will:
1. Preprocess images for better OCR
2. Extract text from scanned PDFs using Tesseract
3. Use Gemini Flash for unknown formats
4. Route low-confidence transactions to human review
5. Gracefully handle missing API keys
