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


# ─── Website Theme Colors ────────────────────────────────────────────────────
INK = colors.HexColor("#111111")
CANVAS = colors.HexColor("#FFFFFF")
SOFT_CLOUD = colors.HexColor("#F5F5F5")
HAIRLINE = colors.HexColor("#CACACB")
SALE = colors.HexColor("#D30005")
SUCCESS = colors.HexColor("#007D48")
MUTE = colors.HexColor("#707072")
CHARCOAL = colors.HexColor("#39393B")

SCORE_COLORS = {
    "green": SUCCESS,
    "yellow": colors.HexColor("#EAB308"),
    "orange": colors.HexColor("#F97316"),
    "red": SALE,
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
    """Generate a themed PDF report matching the SubGuard website design."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.5*inch, bottomMargin=0.5*inch,
        leftMargin=0.6*inch, rightMargin=0.6*inch
    )
    styles = getSampleStyleSheet()
    elements = []

    # ─── Styles ──────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "Title2", parent=styles["Title"],
        fontSize=22, textColor=INK, fontName="Helvetica-Bold",
        spaceAfter=2
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=10, textColor=MUTE
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=13, textColor=INK, fontName="Helvetica-Bold",
        spaceBefore=12, spaceAfter=6
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=9, textColor=CHARCOAL, leading=14
    )
    leak_style = ParagraphStyle(
        "Leak", parent=styles["Normal"],
        fontSize=28, textColor=SALE, fontName="Helvetica-Bold",
        spaceAfter=2
    )
    label_style = ParagraphStyle(
        "Label", parent=styles["Normal"],
        fontSize=8, textColor=MUTE
    )

    # ─── Header ──────────────────────────────────────────────────────────────
    elements.append(Paragraph("SubGuard", title_style))
    elements.append(Paragraph("Subscription Analysis Report", subtitle_style))
    created = analysis.created_at.strftime("%B %d, %Y") if analysis.created_at else "Unknown"
    elements.append(Paragraph(f"Generated on {created}", subtitle_style))
    elements.append(Spacer(1, 0.15*inch))

    # Divider
    elements.append(HRFlowable(width="100%", thickness=2, color=INK))
    elements.append(Spacer(1, 0.2*inch))

    # ─── Hero Stats ──────────────────────────────────────────────────────────
    monthly_leak = analysis.total_monthly_leak or 0
    annual_leak = monthly_leak * 12

    hero_data = [
        [
            Paragraph(f"₹{monthly_leak:,.0f}", leak_style),
            Paragraph(f"{analysis.overall_score}/100", ParagraphStyle(
                "Score", parent=styles["Normal"], fontSize=28,
                textColor=get_score_color(analysis.overall_score), fontName="Helvetica-Bold"
            )),
            Paragraph(str(len(subscriptions)), ParagraphStyle(
                "Count", parent=styles["Normal"], fontSize=28,
                textColor=INK, fontName="Helvetica-Bold"
            )),
        ],
        [
            Paragraph("Monthly Leak", label_style),
            Paragraph("Health Score", label_style),
            Paragraph("Subscriptions", label_style),
        ],
    ]
    hero_table = Table(hero_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
    hero_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), SOFT_CLOUD),
        ("TOPPADDING", (0, 0), (-1, 0), 16),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    elements.append(hero_table)
    elements.append(Spacer(1, 0.15*inch))

    # Annual projection
    elements.append(Paragraph(
        f"Projected annual leak: <b>₹{annual_leak:,.0f}</b>",
        ParagraphStyle("Annual", parent=body_style, fontSize=10, textColor=SALE)
    ))
    elements.append(Spacer(1, 0.25*inch))

    # ─── Subscriptions Table ─────────────────────────────────────────────────
    if subscriptions:
        elements.append(Paragraph("Subscriptions Detected", heading_style))

        sub_header = ["Service", "Amount", "Frequency", "Leak Score", "Action"]
        sub_data = [sub_header]

        for s in subscriptions:
            score = s.leak_score or 0
            action = (s.action.value if hasattr(s.action, 'value') else s.action) or "review"
            sub_data.append([
                s.merchant,
                f"₹{s.amount:,.0f}",
                (s.frequency.value if hasattr(s.frequency, 'value') else s.frequency) or "monthly",
                f"{score}%",
                action.upper(),
            ])

        sub_table = Table(sub_data, colWidths=[1.8*inch, 1*inch, 1.1*inch, 1*inch, 1.1*inch])
        sub_table.setStyle(TableStyle([
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("TEXTCOLOR", (0, 0), (-1, 0), CANVAS),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            # Body
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("TEXTCOLOR", (0, 1), (-1, -1), CHARCOAL),
            # Alignment
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("ALIGN", (3, 0), (4, -1), "CENTER"),
            # Spacing
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            # Grid
            ("LINEBELOW", (0, 0), (-1, 0), 1, INK),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, HAIRLINE),
            # Alternating rows
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CANVAS, SOFT_CLOUD]),
        ]))
        elements.append(sub_table)
        elements.append(Spacer(1, 0.25*inch))

    # ─── AI Summary ──────────────────────────────────────────────────────────
    if ai_summary:
        elements.append(Paragraph("AI Insights", heading_style))
        # Box around summary
        summary_data = [[Paragraph(ai_summary, body_style)]]
        summary_table = Table(summary_data, colWidths=[6.6*inch])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), SOFT_CLOUD),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("LINEBEFORE", (0, 0), (0, -1), 3, SALE),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.25*inch))

    # ─── Transactions Table ──────────────────────────────────────────────────
    if transactions:
        elements.append(Paragraph("Transaction History", heading_style))

        txn_header = ["Date", "Description", "Amount", "Type"]
        txn_data = [txn_header]

        for t in transactions[:50]:
            desc = t.description[:35] + "..." if len(t.description) > 35 else t.description
            txn_type = "Credit" if (t.amount and t.amount > 0 and "credit" in str(getattr(t, 'type', '')).lower()) else "Debit"
            txn_data.append([
                str(t.date.strftime("%d %b %Y") if hasattr(t.date, 'strftime') else t.date),
                desc,
                f"₹{t.amount:,.0f}" if t.amount else "₹0",
                txn_type,
            ])

        txn_table = Table(txn_data, colWidths=[1.2*inch, 2.8*inch, 1.2*inch, 1.2*inch])
        txn_table.setStyle(TableStyle([
            # Header
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("TEXTCOLOR", (0, 0), (-1, 0), CANVAS),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            # Body
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("TEXTCOLOR", (0, 1), (-1, -1), CHARCOAL),
            # Alignment
            ("ALIGN", (2, 0), (2, -1), "RIGHT"),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            # Spacing
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            # Grid
            ("LINEBELOW", (0, 0), (-1, 0), 1, INK),
            ("LINEBELOW", (0, 1), (-1, -1), 0.3, HAIRLINE),
            # Alternating rows
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CANVAS, SOFT_CLOUD]),
        ]))
        elements.append(txn_table)

    # ─── Footer ──────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.4*inch))
    elements.append(HRFlowable(width="100%", thickness=1, color=HAIRLINE))
    elements.append(Spacer(1, 0.1*inch))
    footer_style = ParagraphStyle(
        "Footer", parent=styles["Normal"],
        fontSize=8, textColor=MUTE, alignment=1  # center
    )
    elements.append(Paragraph(
        "Generated by SubGuard — Stop losing money to forgotten subscriptions",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()
