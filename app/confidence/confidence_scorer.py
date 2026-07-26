from app.models import Transaction


class ConfidenceScorer:
    """Calculates field-level confidence scores."""
    
    def score_transaction(self, txn: Transaction) -> Transaction:
        """Score a transaction's confidence."""
        field_confidences = {}
        
        # Date confidence
        if txn.date:
            field_confidences['date'] = 0.95 if txn.extraction_method == 'rules' else 0.85
        
        # Amount confidence
        if txn.amount and txn.amount > 0:
            field_confidences['amount'] = 0.95 if txn.extraction_method == 'rules' else 0.85
        
        # Description confidence
        if txn.description and len(txn.description) >= 3:
            field_confidences['description'] = 0.90
        else:
            field_confidences['description'] = 0.50
        
        # Merchant confidence
        if txn.merchant_normalized:
            field_confidences['merchant'] = 0.85
        else:
            field_confidences['merchant'] = 0.50
        
        # Balance confidence (only score when balance is explicitly provided)
        if txn.balance and txn.balance > 0:
            field_confidences['balance'] = 0.90
        
        # Calculate overall confidence
        if field_confidences:
            overall = sum(field_confidences.values()) / len(field_confidences)
        else:
            overall = 0.0
        
        # Update transaction
        txn.confidence_score = round(overall, 3)
        txn.field_confidences = field_confidences
        
        # Set review flag if confidence is low
        if overall < 0.7:
            txn.needs_review = True
            txn.review_reason = 'Low confidence score'
        
        return txn
    
    def score_transactions(self, transactions: list) -> list:
        """Score a list of transactions."""
        return [self.score_transaction(txn) for txn in transactions]
