import traceback
from app.parsers.pdf_parser import parse_pdf
from app.extractors.transaction_extractor import extract_transactions
from app.detectors.recurring_detector import detect_recurring
from app.scoring.leak_scorer import calculate_leak_score
from app.recommenders.action_recommender import recommend_actions
from app.services.ai_summary import generate_ai_summary
from app.services.comparison import compare_analyses
from app.services.pdf_export import generate_analysis_report
from app.models import AnalysisResult

files = [
    "sample_statements/edge_cases/date_formats.pdf",
    "sample_statements/edge_cases/amount_formats.pdf",
    "sample_statements/edge_cases/descriptions.pdf",
    "sample_statements/edge_cases/subscription_patterns.pdf",
    "sample_statements/edge_cases/structural.pdf",
    "sample_statements/edge_cases/special.pdf",
    "sample_statements/edge_cases/memo_fields.pdf",
    "sample_statements/edge_cases/fees.pdf",
    "sample_statements/edge_cases/ocr_artifacts.pdf",
    "sample_statements/edge_cases/autopay_cancellation.pdf",
    "sample_statements/edge_cases/multi_page.pdf",
]

for f in files:
    name = f.split("/")[-1]
    try:
        text = parse_pdf(f)
        transactions, warnings = extract_transactions(text)
        subs = detect_recurring(transactions)
        for s in subs:
            s.leak_score = calculate_leak_score(s)
        subs = recommend_actions(subs)
        total_monthly = sum(s.amount for s in subs)
        summary = generate_ai_summary(subs, total_monthly)
        
        result = AnalysisResult(
            analysis_id="test",
            status="complete",
            total_monthly_leak=round(total_monthly, 2),
            overall_score=50,
            subscriptions=subs,
            recommendations_summary={"keep": 0, "review": 0, "downgrade": 0, "renegotiate": 0, "cancel": 0},
            warnings=warnings,
        )
        pdf_path = generate_analysis_report(result, f"test_output_{name}.pdf")
        print(f"OK: {name} txns={len(transactions)} subs={len(subs)} warnings={len(warnings)}")
    except Exception as e:
        print(f"ERROR: {name}")
        traceback.print_exc()
        print()
