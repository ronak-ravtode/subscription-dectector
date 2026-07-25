from io import BytesIO
from datetime import datetime
from typing import List
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models import Subscription, Transaction


BRAND_BLUE = colors.HexColor("#3B82F6")
BRAND_GREEN = colors.HexColor("#22C55E")
BRAND_YELLOW = colors.HexColor("#EAB308")
BRAND_RED = colors.HexColor("#EF4444")

SCORE_COLORS = {
    "green": BRAND_GREEN,
    "yellow": BRAND_YELLOW,
    "orange": colors.HexColor("#F97316"),
    "red": BRAND_RED,
}


def get_score_color(score: int) -> colors.Color:
    if score <= 30:
        return SCORE_COLORS["green"]
    elif score <= 60:
        return SCORE_COLORS["yellow"]
    elif score <= 80:
        return SCORE_COLORS["orange"]
    return SCORE_COLORS["red"]


def generate_analysis_report(
    analysis,
    subscriptions: List[Subscription],
    transactions: List[Transaction],
    ai_summary: str = ""
) -> bytes:
    """Generate a branded PDF report for an analysis."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=20, textColor=BRAND_BLUE)
    subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"], fontSize=12, textColor=colors.grey)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontSize=14, textColor=colors.black)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10)

    elements.append(Paragraph("SubGuard Analysis Report", title_style))
    created = analysis.created_at.strftime("%B %d, %Y") if analysis.created_at else "Unknown"
    elements.append(Paragraph(f"Generated on {created}", subtitle_style))
    elements.append(Spacer(1, 0.3*inch))

    elements.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE))
    elements.append(Spacer(1, 0.2*inch))

    elements.append(Paragraph("Analysis Summary", heading_style))
    summary_data = [
        ["Metric", "Value"],
        ["Overall Score", f"{analysis.overall_score}/100"],
        ["Monthly Leak", f"${analysis.total_monthly_leak:.2f}"],
        ["Annual Projection", f"${analysis.total_monthly_leak * 12:.2f}"],
        ["Subscriptions Found", str(len(subscriptions))],
    ]
    summary_table = Table(summary_data, colWidths=[2.5*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))

    if ai_summary:
        elements.append(Paragraph("AI Insights", heading_style))
        elements.append(Paragraph(ai_summary, body_style))
        elements.append(Spacer(1, 0.3*inch))

    if subscriptions:
        elements.append(Paragraph("Subscriptions", heading_style))
        sub_data = [["Merchant", "Amount", "Frequency", "Score", "Action"]]
        for s in subscriptions:
            sub_data.append([
                s.merchant,
                f"${s.amount:.2f}",
                s.frequency.value,
                str(s.leak_score),
                s.action.value,
            ])
        sub_table = Table(sub_data, colWidths=[2*inch, 1.2*inch, 1.2*inch, 0.8*inch, 1.2*inch])
        sub_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(sub_table)
        elements.append(Spacer(1, 0.3*inch))

    if transactions:
        elements.append(Paragraph("Transactions", heading_style))
        txn_data = [["Date", "Description", "Amount", "Category"]]
        for t in transactions[:100]:
            desc = t.description[:30] + "..." if len(t.description) > 30 else t.description
            txn_data.append([
                str(t.date),
                desc,
                f"${t.amount:.2f}",
                t.category or "other",
            ])
        txn_table = Table(txn_data, colWidths=[1.3*inch, 2.5*inch, 1.2*inch, 1.4*inch])
        txn_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(txn_table)

    doc.build(elements)
    return buffer.getvalue()
