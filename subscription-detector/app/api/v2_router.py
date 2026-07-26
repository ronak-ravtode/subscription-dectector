from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.database import get_db
from app.models_db import Analysis, Subscription, TransactionRecord, User
from app.services.csv_export import export_transactions_csv, export_subscriptions_csv
from app.services.pdf_export import generate_analysis_report
from app.models import Transaction, Subscription as DomainSubscription, Frequency, Action, PriceTrend
from app.audit.audit_logger import AuditLogger
from app.monitoring.metrics import MetricsCollector

v2_router = APIRouter(prefix="/api/v2", tags=["v2"])

# Shared logger and metrics instances
audit_logger = AuditLogger()
metrics = MetricsCollector()


@v2_router.get("/spending-trends")
def get_spending_trends(
    db: Session = Depends(get_db),
    user_id: Optional[str] = Query(None)
):
    """Retrieve category spending trends, recurring distributions, and leak scores."""
    metrics.record("v2_spending_trends_requests", 1)

    category_totals: Dict[str, float] = {}
    monthly_leak_history: List[Dict[str, Any]] = []
    analysis_count = 0

    try:
        query = db.query(Analysis)
        if user_id:
            query = query.filter(Analysis.user_id == user_id)
        
        analyses = query.order_by(Analysis.created_at.desc()).limit(10).all()
        analysis_count = len(analyses)

        for a in analyses:
            monthly_leak_history.append({
                "analysis_id": a.id,
                "date": a.created_at.isoformat() if a.created_at else datetime.utcnow().isoformat(),
                "monthly_leak": a.total_monthly_leak,
                "overall_score": a.overall_score
            })
            for sub in a.subscriptions:
                cat = sub.category or "other"
                category_totals[cat] = category_totals.get(cat, 0.0) + sub.amount
    except Exception:
        db.rollback()

    return {
        "status": "success",
        "category_totals": category_totals,
        "monthly_leak_history": monthly_leak_history,
        "analysis_count": analysis_count
    }


@v2_router.get("/documents/{analysis_id}/status")
def get_document_status(analysis_id: str, db: Session = Depends(get_db)):
    """Check processing status of a document analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis document not found")
    
    return {
        "id": analysis.id,
        "status": analysis.status,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "warnings": analysis.warnings or []
    }


@v2_router.get("/documents/{analysis_id}/transactions")
def get_document_transactions(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve canonical transaction records for an analysis document."""
    txns = db.query(TransactionRecord).filter(TransactionRecord.analysis_id == analysis_id).all()
    return {
        "analysis_id": analysis_id,
        "count": len(txns),
        "transactions": [
            {
                "id": t.id,
                "date": t.date.isoformat() if t.date else None,
                "amount": t.amount,
                "description": t.description,
                "category": t.category,
                "is_recurring": t.is_recurring
            } for t in txns
        ]
    }


@v2_router.get("/analysis/{analysis_id}/summary")
def get_analysis_summary(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve financial analysis summary."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return {
        "id": analysis.id,
        "status": analysis.status,
        "total_monthly_leak": analysis.total_monthly_leak,
        "overall_score": analysis.overall_score,
        "ai_summary": analysis.ai_summary,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        "subscriptions_count": len(analysis.subscriptions),
        "transactions_count": len(analysis.transactions)
    }


@v2_router.get("/analysis/{analysis_id}/subscriptions")
def get_analysis_subscriptions(analysis_id: str, db: Session = Depends(get_db)):
    """Retrieve subscription findings for an analysis."""
    subs = db.query(Subscription).filter(Subscription.analysis_id == analysis_id).all()
    return {
        "analysis_id": analysis_id,
        "count": len(subs),
        "subscriptions": [
            {
                "id": s.id,
                "merchant": s.merchant,
                "amount": s.amount,
                "frequency": s.frequency,
                "category": s.category,
                "leak_score": s.leak_score,
                "action": s.action,
                "reasoning": s.reasoning
            } for s in subs
        ]
    }


@v2_router.get("/reports/csv")
def export_csv_report(
    analysis_id: str,
    type: str = Query("transactions", pattern="^(transactions|subscriptions)$"),
    db: Session = Depends(get_db)
):
    """Export analysis data in CSV format."""
    audit_logger.log(user_id="api", action=f"export_csv_{type}", document_id=analysis_id)
    metrics.record("v2_csv_export_count", 1)

    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if type == "subscriptions":
        domain_subs = [
            DomainSubscription(
                id=s.id,
                merchant=s.merchant,
                amount=s.amount,
                frequency=Frequency(s.frequency) if s.frequency in [f.value for f in Frequency] else Frequency.MONTHLY,
                category=s.category or "other",
                leak_score=s.leak_score,
                action=Action(s.action) if s.action in [a.value for a in Action] else Action.REVIEW,
                reasoning=s.reasoning or ""
            ) for s in analysis.subscriptions
        ]
        csv_content = export_subscriptions_csv(domain_subs)
        filename = f"subscriptions_{analysis_id}.csv"
    else:
        domain_txns = [
            Transaction(
                id=t.id,
                date=t.date.date() if isinstance(t.date, datetime) else t.date,
                amount=t.amount,
                description=t.description,
                category=t.category or "other"
            ) for t in analysis.transactions
        ]
        csv_content = export_transactions_csv(domain_txns)
        filename = f"transactions_{analysis_id}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@v2_router.get("/admin/audit-logs")
def get_admin_audit_logs():
    """Retrieve active system audit log events."""
    return {
        "status": "success",
        "logs": audit_logger.get_logs()
    }


@v2_router.get("/admin/metrics")
def get_admin_metrics():
    """Retrieve runtime observability metrics."""
    return {
        "status": "success",
        "metrics": metrics.get_all()
    }


@v2_router.get("/admin/health")
def get_admin_health():
    """Production health check probe."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }
