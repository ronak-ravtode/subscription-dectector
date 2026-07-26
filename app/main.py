import os
import uuid
import tempfile
import base64
import json
from typing import Dict, List
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, Body
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models import AnalysisResult, Subscription, Frequency, Action, PriceTrend
from app.parsers.pdf_parser import parse_pdf
from app.parsers.sms_parser import parse_sms
from app.extractors.transaction_extractor import extract_transactions
from app.understanding.document_classifier import classify_document
from app.extraction.extraction_engine import ExtractionEngine
from app.validation.validation_engine import ValidationEngine
from app.confidence.confidence_scorer import ConfidenceScorer
from app.detectors.recurring_detector import detect_recurring, detect_price_trend, count_price_increases, calculate_duration_months
from app.scoring.leak_scorer import calculate_leak_score
from app.recommenders.action_recommender import recommend_actions
from app.intelligence.intelligence_engine import IntelligenceEngine
from app.intelligence.leak_scorer import LeakScorer
from app.services.ai_summary import generate_ai_summary
from app.services.comparison import compare_analyses
from app.services.pdf_export import generate_analysis_report
from app.database import init_db, get_db
from app.auth.middleware import get_current_user
from app.auth.routes import router as auth_router
from app.user.routes import router as user_router
from app.services.background_scanner import start_scheduler, stop_scheduler
from app.security.rate_limiter import RateLimiter
from app.audit.audit_logger import AuditLogger
from app.monitoring.metrics import MetricsCollector
from app.repositories.user import get_user_by_id
from app.services.twilio import verify_twilio_signature
from app.repositories.sms import save_sms_message, is_duplicate
from app.repositories.analysis import (
    create_analysis,
    update_analysis_status,
    add_subscription_to_analysis,
    get_analysis_by_id
)
from app.repositories.subscription import (
    find_matching_subscription,
    record_price_history
)
from app.models_db import User, TransactionRecord, Analysis

app = FastAPI(title="Subscription Leak Detector")
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "dashboard", "templates"))


class SmsUpload(BaseModel):
    sms_text: str

from fastapi.middleware.cors import CORSMiddleware
from app.middleware.security import SecurityMiddleware

app.add_middleware(SecurityMiddleware)
cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize security and monitoring components
rate_limiter = RateLimiter(max_requests=100, window_seconds=3600)
audit_logger = AuditLogger()
metrics = MetricsCollector()

analyses: Dict[str, AnalysisResult] = {}

from app.auth.routes import router as auth_router
from app.user.routes import router as user_router
from app.api.v2_router import v2_router

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(v2_router)

@app.on_event("startup")
async def startup_event():
    init_db()
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    stop_scheduler()

def calculate_overall_score(subscriptions: List[Subscription]) -> int:
    """Calculate overall score from individual subscription scores."""
    if not subscriptions:
        return 0
    scores = [s.leak_score for s in subscriptions]
    return round(sum(scores) / len(scores))

def summarize_recommendations(subscriptions: List[Subscription]) -> dict:
    """Summarize action recommendations."""
    summary = {"keep": 0, "review": 0, "downgrade": 0, "renegotiate": 0, "cancel": 0}
    for sub in subscriptions:
        action_key = sub.action.value
        if action_key in summary:
            summary[action_key] += 1
    return summary

async def analyze_statement(file_path: str, user_id: str, db: Session, analysis_id: str = None) -> AnalysisResult:
    """Main analysis pipeline."""
    if not analysis_id:
        analysis_id = str(uuid.uuid4())
    warnings = []

    text = parse_pdf(file_path)

    if not text or len(text.strip()) < 10:
        result = AnalysisResult(
            analysis_id=analysis_id,
            status="error",
            warnings=[{"type": "parser", "message": "Could not extract text from PDF. The file may be scanned or in an unsupported format."}],
        )
        update_analysis_status(db, analysis_id, "error", warnings=[{"type": "parser", "message": "Could not extract text from PDF. The file may be scanned or in an unsupported format."}])
        return result

    # Classify document to detect bank and document type
    doc_info = classify_document(text)

    # Extract transactions using new tiered engine
    extraction_engine = ExtractionEngine()
    extraction_result = extraction_engine.extract(text, bank_code=doc_info.bank_code, pdf_path=file_path)
    transactions = extraction_result.transactions

    # Convert string warnings to dict format for compatibility
    for w in extraction_result.warnings:
        warnings.append({"type": "extraction", "message": w})

    # Fall back to legacy extractor if new engine found nothing
    if not transactions:
        transactions, legacy_warnings = extract_transactions(text)
        warnings.extend(legacy_warnings)

    # Fall back to Tier 3 AI extractor directly on PDF if still nothing found
    if not transactions and file_path and os.path.exists(file_path):
        try:
            from app.extraction.tier3_ai import AIExtractor
            ai_result = AIExtractor().extract(file_path, bank_code=doc_info.bank_code)
            if ai_result.transactions:
                transactions = ai_result.transactions
        except Exception as e:
            pass

    # Validate extracted transactions
    if transactions:
        validation_engine = ValidationEngine()
        validation_result = validation_engine.validate(transactions)
        for issue in validation_result.issues:
            if issue.severity == 'error':
                warnings.append({"type": "validation", "message": issue.message})
            elif issue.severity == 'warning':
                warnings.append({"type": "validation", "message": issue.message})

    # Score confidence for each transaction
    if transactions:
        scorer = ConfidenceScorer()
        transactions = scorer.score_transactions(transactions)

    if not transactions:
        result = AnalysisResult(
            analysis_id=analysis_id,
            status="complete",
            warnings=[{"type": "parser", "message": "No transactions detected. The PDF may be scanned or in an unusual format."}],
        )
        update_analysis_status(db, analysis_id, "complete", warnings=[{"type": "parser", "message": "No transactions detected. The PDF may be scanned or in an unusual format."}])
        return result

    if len(transactions) > 500:
        transactions = transactions[:500]
        warnings.append({"type": "parser", "message": "Transaction limit exceeded (500 max). Only the first 500 transactions were analyzed."})

    for txn in transactions:
        from app.extractors.transaction_extractor import clean_description
        short_desc = clean_description(txn.description)
        if short_desc:
            txn.description = short_desc
            txn.merchant_normalized = short_desc

        txn_record = TransactionRecord(
            id=txn.id,
            analysis_id=analysis_id,
            date=txn.date,
            amount=txn.amount,
            description=txn.description,
            category=txn.category,
            is_recurring=False,
        )
        db.add(txn_record)
    db.commit()

    # Run intelligence engine
    engine = IntelligenceEngine()
    intel_result = engine.analyze(transactions)

    # Map intelligence engine results to API Subscription model
    freq_map = {
        'weekly': Frequency.WEEKLY,
        'monthly': Frequency.MONTHLY,
        'quarterly': Frequency.QUARTERLY,
        'annual': Frequency.ANNUAL,
    }
    action_map = {
        'keep': Action.KEEP,
        'review': Action.REVIEW,
        'downgrade': Action.DOWNGRADE,
        'renegotiate': Action.RENEGOTIATE,
        'cancel': Action.CANCEL,
    }

    subscriptions = []
    recurring_txn_ids = set()

    for i, intel_sub in enumerate(intel_result.subscriptions):
        if not intel_sub.merchant or not intel_sub.merchant.strip() or intel_sub.merchant.upper() == "UNKNOWN":
            continue
        from app.extractors.transaction_extractor import is_person_transfer
        if is_person_transfer(intel_sub.merchant):
            continue
        if intel_sub.amount < 1.0:
            continue

        rec = intel_result.recommendations[i] if i < len(intel_result.recommendations) else None
        sub_txns = [t for t in transactions if t.id in intel_sub.transaction_ids]
        amounts = [t.amount for t in sub_txns]

        frequency = freq_map.get(intel_sub.frequency, Frequency.MONTHLY)
        price_trend = detect_price_trend(amounts) if amounts else PriceTrend.STABLE
        price_increases = count_price_increases(amounts) if amounts else 0
        duration_months = calculate_duration_months(sub_txns) if sub_txns else 0

        action = action_map.get(rec.action if rec else 'review', Action.REVIEW)
        reasoning = rec.reasoning if rec else ''
        leak_score = intel_result.leak_score if intel_result.subscriptions else 0

        leak_scorer = LeakScorer()
        leak_score = leak_scorer.calculate(intel_sub)

        subscriptions.append(Subscription(
            id=str(uuid.uuid4()),
            merchant=intel_sub.merchant,
            amount=round(intel_sub.amount, 2),
            frequency=frequency,
            category=intel_sub.category,
            leak_score=leak_score,
            action=action,
            reasoning=reasoning,
            price_trend=price_trend,
            duration_months=duration_months,
            price_increases=price_increases,
        ))

        for txn in sub_txns:
            recurring_txn_ids.add(txn.id)

    for txn in transactions:
        if txn.id in recurring_txn_ids:
            txn_record = db.query(TransactionRecord).filter(
                TransactionRecord.id == txn.id
            ).first()
            if txn_record:
                txn_record.is_recurring = True
    db.commit()

    if not subscriptions:
        ai_summary_text = generate_ai_summary([], 0.0)
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=0.0, overall_score=0, warnings=warnings)
        db_analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if db_analysis:
            db_analysis.ai_summary = ai_summary_text
            db.commit()
        result = AnalysisResult(
            analysis_id=analysis_id,
            status="complete",
            total_monthly_leak=0.0,
            overall_score=0,
            subscriptions=[],
            recommendations_summary={"keep": 0, "review": 0, "downgrade": 0, "renegotiate": 0, "cancel": 0},
            warnings=warnings,
        )
        return result

    total_monthly = sum(s.amount for s in subscriptions)
    overall_score = calculate_overall_score(subscriptions)

    db_analysis = update_analysis_status(
        db,
        analysis_id,
        "complete",
        total_monthly_leak=round(total_monthly, 2),
        overall_score=overall_score,
        warnings=warnings
    )

    ai_summary_text = generate_ai_summary(subscriptions, total_monthly)
    if db_analysis:
        db_analysis.ai_summary = ai_summary_text
        db.commit()

    for sub in subscriptions:
        add_subscription_to_analysis(db, analysis_id, {
            "merchant": sub.merchant,
            "amount": sub.amount,
            "frequency": sub.frequency.value,
            "category": sub.category,
            "leak_score": sub.leak_score,
            "action": sub.action.value,
            "reasoning": sub.reasoning,
            "price_trend": sub.price_trend.value if hasattr(sub.price_trend, 'value') else sub.price_trend,
            "duration_months": sub.duration_months,
            "price_increases": sub.price_increases
        })

    result = AnalysisResult(
        analysis_id=analysis_id,
        status="complete",
        total_monthly_leak=round(total_monthly, 2),
        overall_score=overall_score,
        subscriptions=subscriptions,
        recommendations_summary=summarize_recommendations(subscriptions),
        warnings=warnings,
        created_at=db_analysis.created_at if db_analysis else None
    )

    return result

@app.post("/api/upload")
async def upload_statement(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and analyze a bank statement PDF."""
    # Rate limiting
    rate_key = f"upload:{current_user.id}"
    if not rate_limiter.is_allowed(rate_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    # Audit log - upload request
    client_ip = request.client.host if request.client else None
    audit_logger.log(
        user_id=current_user.id,
        action="upload_request",
        details={"filename": file.filename},
        ip_address=client_ip,
    )
    metrics.record("upload_count", 1)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a valid PDF file")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        analysis_id = str(uuid.uuid4())
        create_analysis(db, current_user.id, analysis_id)

        result = await analyze_statement(tmp_path, current_user.id, db, analysis_id=analysis_id)

        # Audit log - analysis complete
        audit_logger.log(
            user_id=current_user.id,
            action="analysis_complete",
            document_id=analysis_id,
            details={"status": result.status, "subscriptions_found": len(result.subscriptions) if result.subscriptions else 0},
        )
        metrics.record("analysis_complete", 1)

        return {
            "analysis_id": result.analysis_id,
            "status": result.status,
            "message": "Analyzing your statement..." if result.status == "processing" else "Analysis complete",
            "created_at": result.created_at
        }
    finally:
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

@app.post("/api/upload-sms")
async def upload_sms(
    body: SmsUpload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse SMS text, detect recurring subscriptions, and store results."""
    # Rate limiting
    rate_key = f"sms:{current_user.id}"
    if not rate_limiter.is_allowed(rate_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

    # Audit log
    audit_logger.log(
        user_id=current_user.id,
        action="sms_upload",
        details={"text_length": len(body.sms_text)},
    )
    metrics.record("sms_upload_count", 1)

    sms_data = parse_sms(body.sms_text)

    if not sms_data:
        raise HTTPException(status_code=400, detail="No transactions found in SMS text")

    import uuid as _uuid
    from datetime import datetime as _dt
    transactions = []
    for item in sms_data:
        try:
            txn_date = _dt.strptime(item['date'], '%Y-%m-%d').date()
        except (ValueError, KeyError):
            txn_date = _dt.today().date()
        from app.models import Transaction as _Txn
        transactions.append(_Txn(
            id=str(_uuid.uuid4()),
            date=txn_date,
            amount=item['amount'],
            description=item['description'],
        ))

    analysis_id = str(uuid.uuid4())
    create_analysis(db, current_user.id, analysis_id)

    # Run intelligence engine
    engine = IntelligenceEngine()
    intel_result = engine.analyze(transactions)

    freq_map = {
        'weekly': Frequency.WEEKLY,
        'monthly': Frequency.MONTHLY,
        'quarterly': Frequency.QUARTERLY,
        'annual': Frequency.ANNUAL,
    }
    action_map = {
        'keep': Action.KEEP,
        'review': Action.REVIEW,
        'downgrade': Action.DOWNGRADE,
        'renegotiate': Action.RENEGOTIATE,
        'cancel': Action.CANCEL,
    }

    subscriptions = []
    for i, intel_sub in enumerate(intel_result.subscriptions):
        rec = intel_result.recommendations[i] if i < len(intel_result.recommendations) else None
        sub_txns = [t for t in transactions if t.id in intel_sub.transaction_ids]
        amounts = [t.amount for t in sub_txns]

        leak_scorer = LeakScorer()
        leak_score = leak_scorer.calculate(intel_sub)

        subscriptions.append(Subscription(
            id=str(uuid.uuid4()),
            merchant=intel_sub.merchant,
            amount=round(intel_sub.amount, 2),
            frequency=freq_map.get(intel_sub.frequency, Frequency.MONTHLY),
            category=intel_sub.category,
            leak_score=leak_score,
            action=action_map.get(rec.action if rec else 'review', Action.REVIEW),
            reasoning=rec.reasoning if rec else '',
            price_trend=detect_price_trend(amounts) if amounts else PriceTrend.STABLE,
            price_increases=count_price_increases(amounts) if amounts else 0,
            duration_months=calculate_duration_months(sub_txns) if sub_txns else 0,
        ))

    if not subscriptions:
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=0.0, overall_score=0, warnings=["No recurring subscriptions detected from SMS."])
        return {
            "analysis_id": analysis_id,
            "status": "complete",
            "message": "No recurring subscriptions detected from SMS."
        }

    total_monthly = sum(s.amount for s in subscriptions)
    overall_score = calculate_overall_score(subscriptions)

    update_analysis_status(
        db,
        analysis_id,
        "complete",
        total_monthly_leak=round(total_monthly, 2),
        overall_score=overall_score,
        warnings=[]
    )

    for sub in subscriptions:
        add_subscription_to_analysis(db, analysis_id, {
            "merchant": sub.merchant,
            "amount": sub.amount,
            "frequency": sub.frequency.value,
            "category": sub.category,
            "leak_score": sub.leak_score,
            "action": sub.action.value,
            "reasoning": sub.reasoning,
            "price_trend": sub.price_trend.value if hasattr(sub.price_trend, 'value') else sub.price_trend,
            "duration_months": sub.duration_months,
            "price_increases": sub.price_increases
        })

    return {
        "analysis_id": analysis_id,
        "status": "complete",
        "message": "Analysis complete"
    }

@app.post("/api/inbound-sms")
async def inbound_sms(request: Request, db: Session = Depends(get_db)):
    """Receive incoming SMS from Twilio webhook."""
    form_data = await request.form()
    params = {k: v for k, v in form_data.items()}

    # Verify Twilio signature
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)

    if not verify_twilio_signature(url, params, signature):
        audit_logger.log(user_id="unknown", action="sms_webhook_rejected", details={"reason": "invalid_signature"})
        return Response(status_code=403)

    message_sid = params.get("MessageSid", "")
    from_number = params.get("From", "")
    to_number = params.get("To", "")
    body = params.get("Body", "")

    # Dedup
    if is_duplicate(db, message_sid):
        return Response(status_code=200)

    # Find user by Twilio "To" number (the platform's Twilio number -> user mapping)
    user = db.query(User).filter(User.phone_number == to_number).first()
    if not user:
        # Fallback: find any user with SMS forwarding enabled
        user = db.query(User).filter(User.sms_forwarding_enabled == True).first()

    if not user:
        audit_logger.log(user_id="unknown", action="sms_webhook_no_user", details={"from": from_number})
        return Response(status_code=200)

    # Rate limiting
    rate_key = f"sms:{user.id}"
    if not rate_limiter.is_allowed(rate_key):
        audit_logger.log(user_id=user.id, action="sms_webhook_rate_limited", details={"message_sid": message_sid})
        return Response(status_code=200)

    # Parse SMS
    sms_data = parse_sms(body)

    # Save raw SMS
    save_sms_message(db, user.id, message_sid, from_number, body, sms_data)

    if not sms_data:
        return Response(status_code=200)

    # Convert to Transaction objects and run pipeline
    import uuid as _uuid
    from datetime import datetime as _dt
    from app.models import Transaction as _Txn, Frequency, PriceTrend, Action, Subscription as _Sub

    transactions = []
    for item in sms_data:
        try:
            txn_date = _dt.strptime(item['date'], '%Y-%m-%d').date()
        except (ValueError, KeyError):
            txn_date = _dt.today().date()
        transactions.append(_Txn(
            id=str(_uuid.uuid4()),
            date=txn_date,
            amount=item['amount'],
            description=item.get('merchant', item['description']),
        ))

    # Run intelligence engine
    analysis_id = str(_uuid.uuid4())
    create_analysis(db, user.id, analysis_id)

    engine = IntelligenceEngine()
    intel_result = engine.analyze(transactions)

    # Map to subscriptions
    freq_map = {
        'weekly': Frequency.WEEKLY,
        'monthly': Frequency.MONTHLY,
        'quarterly': Frequency.QUARTERLY,
        'annual': Frequency.ANNUAL,
    }
    action_map = {
        'keep': Action.KEEP,
        'review': Action.REVIEW,
        'downgrade': Action.DOWNGRADE,
        'renegotiate': Action.RENEGOTIATE,
        'cancel': Action.CANCEL,
    }

    subscriptions = []
    for i, intel_sub in enumerate(intel_result.subscriptions):
        rec = intel_result.recommendations[i] if i < len(intel_result.recommendations) else None
        sub_txns = [t for t in transactions if t.id in intel_sub.transaction_ids]
        amounts = [t.amount for t in sub_txns]

        leak_scorer = LeakScorer()
        leak_score = leak_scorer.calculate(intel_sub)

        subscriptions.append(_Sub(
            id=str(_uuid.uuid4()),
            merchant=intel_sub.merchant,
            amount=round(intel_sub.amount, 2),
            frequency=freq_map.get(intel_sub.frequency, Frequency.MONTHLY),
            category=intel_sub.category,
            leak_score=leak_score,
            action=action_map.get(rec.action if rec else 'review', Action.REVIEW),
            reasoning=rec.reasoning if rec else '',
            price_trend=detect_price_trend(amounts) if amounts else PriceTrend.STABLE,
            price_increases=count_price_increases(amounts) if amounts else 0,
            duration_months=calculate_duration_months(sub_txns) if sub_txns else 0,
        ))

    if subscriptions:
        total_monthly = sum(s.amount for s in subscriptions)
        overall_score = calculate_overall_score(subscriptions)
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=round(total_monthly, 2), overall_score=overall_score, warnings=[])
        for sub in subscriptions:
            add_subscription_to_analysis(db, analysis_id, {
                "merchant": sub.merchant,
                "amount": sub.amount,
                "frequency": sub.frequency.value,
                "category": sub.category,
                "leak_score": sub.leak_score,
                "action": sub.action.value,
                "reasoning": sub.reasoning,
                "price_trend": sub.price_trend.value if hasattr(sub.price_trend, 'value') else sub.price_trend,
                "duration_months": sub.duration_months,
                "price_increases": sub.price_increases,
            })
    else:
        update_analysis_status(db, analysis_id, "complete", total_monthly_leak=0.0, overall_score=0, warnings=["No recurring subscriptions detected from SMS."])

    audit_logger.log(user_id=user.id, action="sms_inbound_processed", details={"message_sid": message_sid, "subscriptions_found": len(subscriptions)})
    metrics.record("sms_inbound_count", 1)

    return Response(status_code=200)


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get analysis results with transactions, AI summary, and comparison."""
    analysis = get_analysis_by_id(db, analysis_id, current_user.id)
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    from app.repositories.subscription import get_subscriptions_by_analysis
    subscriptions = get_subscriptions_by_analysis(db, analysis_id)
    
    txn_records = db.query(TransactionRecord).filter(
        TransactionRecord.analysis_id == analysis_id
    ).all()
    
    comparison = compare_analyses(db, analysis_id, current_user.id)
    
    recommendations = summarize_recommendations_from_subs(subscriptions)
    
    return {
        "analysis_id": analysis.id,
        "status": analysis.status,
        "total_monthly_leak": analysis.total_monthly_leak,
        "overall_score": analysis.overall_score,
        "subscriptions": [
            {
                "id": s.id,
                "merchant": s.merchant,
                "amount": s.amount,
                "frequency": s.frequency,
                "category": s.category,
                "leak_score": s.leak_score,
                "action": s.action,
                "reasoning": s.reasoning,
                "price_trend": s.price_trend,
                "duration_months": s.duration_months,
                "price_increases": s.price_increases
            }
            for s in subscriptions
        ],
        "transactions": [
            {
                "id": t.id,
                "date": t.date.isoformat() if t.date else None,
                "amount": t.amount,
                "description": t.description,
                "category": t.category,
                "is_recurring": t.is_recurring,
            }
            for t in txn_records
        ],
        "ai_summary": analysis.ai_summary,
        "recommendations_summary": recommendations,
        "warnings": analysis.warnings or [],
        "comparison": comparison,
        "created_at": analysis.created_at
    }

@app.get("/api/subscriptions")
async def list_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all detected subscriptions."""
    from app.repositories.subscription import get_user_subscriptions
    return get_user_subscriptions(db, current_user.id)

@app.get("/api/summary")
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get overall leak summary."""
    from app.repositories.subscription import get_user_subscriptions
    
    subscriptions = get_user_subscriptions(db, current_user.id)
    
    total_monthly = sum(s.amount for s in subscriptions)
    high_risk = sum(1 for s in subscriptions if s.leak_score > 60)
    
    return {
        "total_monthly_leak": round(total_monthly, 2),
        "total_annual_leak": round(total_monthly * 12, 2),
        "subscription_count": len(subscriptions),
        "high_risk_count": high_risk,
        "potential_savings": round(total_monthly * 0.4, 2),
    }

@app.post("/api/inbound-email")
async def receive_inbound_email(request: Request, db: Session = Depends(get_db)):
    """Handle inbound email from SendGrid/SES webhook."""
    from app.utils.email import parse_forwarding_address
    from app.services.webhook import verify_webhook_signature

    raw_body = await request.body()

    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
    if not verify_webhook_signature(raw_body, signature):
        audit_logger.log(user_id="system", action="webhook_auth_failed", details={"reason": "invalid_signature"})
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    audit_logger.log(user_id="system", action="inbound_email_received")
    metrics.record("inbound_email_count", 1)

    form = await request.form()
    
    to_email = form.get("to", "")
    text_body = form.get("text", "")
    html_body = form.get("html", "")
    attachments_json = form.get("attachments", "[]")
    
    user_id_prefix = parse_forwarding_address(to_email)
    user = db.query(User).filter(User.id.like(f"{user_id_prefix}%")).first()
    
    if not user:
        return {"status": "ignored", "reason": "unknown user"}
    
    try:
        attachments = json.loads(attachments_json)
    except json.JSONDecodeError:
        attachments = []
    
    processed = 0
    for att in attachments:
        if att.get("type") == "application/pdf" or att.get("filename", "").endswith(".pdf"):
            try:
                pdf_data = base64.b64decode(att["content"])
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(pdf_data)
                    tmp_path = tmp.name
                
                analysis_id = str(uuid.uuid4())
                create_analysis(db, user.id, analysis_id)
                await analyze_statement(tmp_path, user.id, db, analysis_id=analysis_id)
                os.unlink(tmp_path)
                processed += 1
                audit_logger.log(user_id=user.id, action="email_attachment_processed", document_id=analysis_id)
                metrics.record("email_analysis_count", 1)
            except Exception as e:
                print(f"Failed to process attachment: {e}")

    if processed == 0:
        from app.parsers.email_parser import extract_transactions_from_email
        email_content = text_body or html_body
        if email_content:
            email_txns = extract_transactions_from_email(email_content)
            if email_txns:
                import uuid as _uuid
                from datetime import datetime as _dt
                from app.models import Transaction as _Txn
                transactions = []
                for item in email_txns:
                    try:
                        txn_date = _dt.strptime(item['date'], '%Y-%m-%d').date()
                    except (ValueError, KeyError):
                        try:
                            txn_date = _dt.strptime(item['date'], '%m/%d/%Y').date()
                        except (ValueError, KeyError):
                            txn_date = _dt.today().date()
                    try:
                        amount_str = item['amount'].replace(',', '').replace('$', '').replace('₹', '').replace('€', '').replace('£', '').strip()
                        amount = float(amount_str)
                    except (ValueError, AttributeError):
                        continue
                    if amount <= 0:
                        continue
                    transactions.append(_Txn(
                        id=str(_uuid.uuid4()),
                        date=txn_date,
                        amount=amount,
                        description=item.get('description', 'Unknown'),
                    ))

                if transactions:
                    analysis_id = str(uuid.uuid4())
                    create_analysis(db, user.id, analysis_id)

                    _freq_map = {
                        'weekly': Frequency.WEEKLY,
                        'monthly': Frequency.MONTHLY,
                        'quarterly': Frequency.QUARTERLY,
                        'annual': Frequency.ANNUAL,
                    }
                    _action_map = {
                        'keep': Action.KEEP,
                        'review': Action.REVIEW,
                        'downgrade': Action.DOWNGRADE,
                        'renegotiate': Action.RENEGOTIATE,
                        'cancel': Action.CANCEL,
                    }

                    intel_engine = IntelligenceEngine()
                    intel_result = intel_engine.analyze(transactions)

                    subs = []
                    for i, intel_sub in enumerate(intel_result.subscriptions):
                        rec = intel_result.recommendations[i] if i < len(intel_result.recommendations) else None
                        sub_txns = [t for t in transactions if t.id in intel_sub.transaction_ids]
                        amounts = [t.amount for t in sub_txns]

                        leak_scorer_local = LeakScorer()
                        leak_score = leak_scorer_local.calculate(intel_sub)

                        subs.append(Subscription(
                            id=str(uuid.uuid4()),
                            merchant=intel_sub.merchant,
                            amount=round(intel_sub.amount, 2),
                            frequency=_freq_map.get(intel_sub.frequency, Frequency.MONTHLY),
                            category=intel_sub.category,
                            leak_score=leak_score,
                            action=_action_map.get(rec.action if rec else 'review', Action.REVIEW),
                            reasoning=rec.reasoning if rec else '',
                            price_trend=detect_price_trend(amounts) if amounts else PriceTrend.STABLE,
                            price_increases=count_price_increases(amounts) if amounts else 0,
                            duration_months=calculate_duration_months(sub_txns) if sub_txns else 0,
                        ))

                    if subs:
                        total_monthly = sum(s.amount for s in subs)
                        overall_score = calculate_overall_score(subs)
                        update_analysis_status(
                            db, analysis_id, "complete",
                            total_monthly_leak=round(total_monthly, 2),
                            overall_score=overall_score,
                            warnings=[]
                        )
                        for sub in subs:
                            add_subscription_to_analysis(db, analysis_id, {
                                "merchant": sub.merchant,
                                "amount": sub.amount,
                                "frequency": sub.frequency.value,
                                "category": sub.category,
                                "leak_score": sub.leak_score,
                                "action": sub.action.value,
                                "reasoning": sub.reasoning,
                                "price_trend": sub.price_trend.value if hasattr(sub.price_trend, 'value') else sub.price_trend,
                                "duration_months": sub.duration_months,
                                "price_increases": sub.price_increases
                            })
                        processed += 1
                    else:
                        update_analysis_status(db, analysis_id, "complete", warnings=["No recurring subscriptions detected from email body."])
    
    return {"status": "processed", "attachments_processed": processed}

def summarize_recommendations_from_subs(subscriptions) -> dict:
    """Summarize action recommendations from DB subscription objects."""
    summary = {"keep": 0, "review": 0, "downgrade": 0, "renegotiate": 0, "cancel": 0}
    for sub in subscriptions:
        action_key = sub.action
        if action_key in summary:
            summary[action_key] += 1
    return summary

@app.get("/api/analysis/{analysis_id}/compare")
async def get_analysis_comparison(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get comparison with previous analysis."""
    analysis = get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    comparison = compare_analyses(db, analysis_id, current_user.id)
    return comparison or {"message": "No previous analysis to compare"}

@app.post("/api/analysis/{analysis_id}/export")
async def export_analysis_pdf(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export analysis as branded PDF report."""
    analysis = get_analysis_by_id(db, analysis_id, current_user.id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Audit log
    audit_logger.log(
        user_id=current_user.id,
        action="export_pdf",
        document_id=analysis_id,
    )
    metrics.record("export_count", 1)

    from app.repositories.subscription import get_subscriptions_by_analysis
    subscriptions = get_subscriptions_by_analysis(db, analysis_id)

    txn_records = db.query(TransactionRecord).filter(
        TransactionRecord.analysis_id == analysis_id
    ).all()

    pdf_bytes = generate_analysis_report(
        analysis=analysis,
        subscriptions=subscriptions,
        transactions=txn_records,
        ai_summary=analysis.ai_summary or ""
    )
    
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=subguard-analysis-{analysis_id[:8]}.pdf"}
    )

frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/", response_class=HTMLResponse)
    async def dashboard(request: Request):
        """Serve dashboard UI (Jinja2 fallback)."""
        from jinja2 import Environment, FileSystemLoader
        template_dir = os.path.join(os.path.dirname(__file__), "dashboard", "templates")
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("index.html")
        html = template.render()
        return HTMLResponse(content=html)
