"""
Demo Data Generator for SubGuard
Creates sample bank statement PDFs for all 6 supported banks
and seeds the database with professional dummy data.
"""

import os
import sys
import json
import random
from datetime import datetime, timedelta

# Add the project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ─── Subscription Data ───────────────────────────────────────────────────────

SUBSCRIPTIONS = [
    {"merchant": "Netflix", "amount": 649, "frequency": "monthly", "category": "entertainment"},
    {"merchant": "Spotify", "amount": 179, "frequency": "monthly", "category": "entertainment"},
    {"merchant": "YouTube Premium", "amount": 189, "frequency": "monthly", "category": "entertainment"},
    {"merchant": "Jio Prime", "amount": 399, "frequency": "monthly", "category": "telecom"},
    {"merchant": "Amazon Prime", "amount": 179, "frequency": "monthly", "category": "entertainment"},
    {"merchant": "Google One", "amount": 130, "frequency": "monthly", "category": "cloud"},
    {"merchant": "iCloud+", "amount": 79, "frequency": "monthly", "category": "cloud"},
    {"merchant": "ChatGPT Plus", "amount": 1600, "frequency": "monthly", "category": "productivity"},
    {"merchant": "Adobe Creative Cloud", "amount": 4888, "frequency": "monthly", "category": "productivity"},
    {"merchant": "Hotstar", "amount": 149, "frequency": "monthly", "category": "entertainment"},
]


# ─── Transaction Templates ──────────────────────────────────────────────────

REGULAR_TRANSACTIONS = [
    {"desc": "UPI/SWIGGY/Order Food", "amount_range": (150, 800), "type": "debit"},
    {"desc": "UPI/ZOMATO/Restaurant", "amount_range": (200, 1200), "type": "debit"},
    {"desc": "ATM WDL", "amount_range": (2000, 10000), "type": "debit"},
    {"desc": "UPI/AMAZON/Shopping", "amount_range": (500, 5000), "type": "debit"},
    {"desc": "SALARY CREDIT", "amount_range": (50000, 120000), "type": "credit"},
    {"desc": "UPI/PHONEPE/Transfer", "amount_range": (500, 5000), "type": "debit"},
    {"desc": "NEFT FROM EMPLOYER", "amount_range": (50000, 120000), "type": "credit"},
    {"desc": "UPI/DMART/Groceries", "amount_range": (800, 3000), "type": "debit"},
    {"desc": "UPI/RELIANCE/Fuel", "amount_range": (500, 2000), "type": "debit"},
    {"desc": "UPI/IRCTC/Ticket", "amount_range": (300, 2500), "type": "debit"},
    {"desc": "INTEREST CREDIT", "amount_range": (50, 500), "type": "credit"},
    {"desc": "UPI/CROMA/Electronics", "amount_range": (1000, 15000), "type": "debit"},
    {"desc": "UPI/MEDICAL/Pharmacy", "amount_range": (200, 1500), "type": "debit"},
    {"desc": "UPI/OLA/Cab", "amount_range": (100, 600), "type": "debit"},
    {"desc": "UPI/BOOKMYSHOW/Tickets", "amount_range": (200, 800), "type": "debit"},
]


def random_date(start_date, end_date):
    """Generate a random date between start and end."""
    delta = end_date - start_date
    random_days = random.randint(0, delta.days)
    return start_date + timedelta(days=random_days)


def generate_transactions(num_transactions=40, start_date=None, end_date=None):
    """Generate a list of realistic transactions with subscriptions mixed in."""
    if not start_date:
        end_date = datetime(2026, 6, 30)
        start_date = datetime(2026, 1, 1)

    transactions = []

    # Add salary credits on 1st of each month
    current = start_date
    while current <= end_date:
        if current.day <= 3:
            transactions.append({
                "date": current.replace(day=random.randint(1, 3)),
                "desc": "SALARY CREDIT FROM INFOSYS LTD",
                "amount": random.randint(75000, 95000),
                "type": "credit",
                "balance": random.randint(100000, 250000),
            })
        current += timedelta(days=30)

    # Add subscriptions on 1st-5th of each month
    current = start_date
    while current <= end_date:
        if current.day <= 5:
            # Pick 4-6 random subscriptions for this month
            month_subs = random.sample(SUBSCRIPTIONS, random.randint(4, 6))
            for sub in month_subs:
                txn_date = current.replace(day=random.randint(1, 5))
                if txn_date >= start_date and txn_date <= end_date:
                    transactions.append({
                        "date": txn_date,
                        "desc": f"UPI/{sub['merchant'].upper()}/Subscription",
                        "amount": sub["amount"],
                        "type": "debit",
                        "balance": random.randint(50000, 200000),
                    })
        current += timedelta(days=30)

    # Add regular transactions
    for _ in range(num_transactions):
        template = random.choice(REGULAR_TRANSACTIONS)
        txn_date = random_date(start_date, end_date)
        amount = random.randint(*template["amount_range"])

        balance = random.randint(50000, 250000)
        transactions.append({
            "date": txn_date,
            "desc": template["desc"],
            "amount": amount,
            "type": template["type"],
            "balance": balance,
        })

    # Sort by date
    transactions.sort(key=lambda x: x["date"])
    return transactions


# ─── PDF Generators ──────────────────────────────────────────────────────────

def create_sbi_statement(transactions, filename):
    """Create SBI-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=30*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=6)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold')

    elements = []

    # Header
    elements.append(Paragraph("STATE BANK OF INDIA", title_style))
    elements.append(Paragraph("Personal Banking - Account Statement", subtitle_style))
    elements.append(Spacer(1, 10*mm))

    # Account info
    info_data = [
        ["Account No:", "3XXXXXXXXXX1234", "Statement Period:", "01/01/2026 - 30/06/2026"],
        ["Name:", "RAKESH KUMAR SHARMA", "Branch:", "ANDHERI WEST, MUMBAI"],
        ["Account Type:", "SAVINGS BANK", "IFSC Code:", "SBIN0001234"],
    ]
    info_table = Table(info_data, colWidths=[80, 150, 80, 150])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.Color(0.2, 0.2, 0.2)),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.Color(0.2, 0.2, 0.2)),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 8*mm))

    # Transaction header
    header = ["Txn Date", "Value Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        debit = f"{txn['amount']:,.2f}" if txn["type"] == "debit" else ""
        credit = f"{txn['amount']:,.2f}" if txn["type"] == "credit" else ""
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, date_str, txn["desc"][:40], debit, credit, balance])

    table = Table(table_data, colWidths=[65, 65, 180, 70, 70, 70])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.85, 0.1, 0.1)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.97, 0.97, 0.97)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


def create_hdfc_statement(transactions, filename):
    """Create HDFC-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=25*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=4,
                                  textColor=colors.Color(0, 0.2, 0.5))
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("HDFC BANK", title_style))
    elements.append(Paragraph("Savings Account Statement", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    info_data = [
        ["Account Number:", "5XXXXXXXXXX5678", "Period:", "01-Jan-2026 to 30-Jun-2026"],
        ["Customer Name:", "RAKESH KUMAR SHARMA", "Branch:", "MALAD WEST, MUMBAI"],
        ["Customer ID:", "CUSTXXXXXXXX", "Account Type:", "Regular Savings"],
    ]
    info_table = Table(info_data, colWidths=[90, 150, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    header = ["Date", "Narration", "Chq/Ref No", "Value Dat", "Withdrawal", "Deposit", "Balance"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        withdrawal = f"{txn['amount']:,.2f}" if txn["type"] == "debit" else ""
        deposit = f"{txn['amount']:,.2f}" if txn["type"] == "credit" else ""
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, txn["desc"][:35], "UPI", date_str, withdrawal, deposit, balance])

    table = Table(table_data, colWidths=[60, 150, 50, 60, 65, 65, 70])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0, 0.2, 0.5)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.97, 1.0)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


def create_icici_statement(transactions, filename):
    """Create ICICI-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=25*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=4,
                                  textColor=colors.Color(0.6, 0, 0))
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("ICICI BANK LIMITED", title_style))
    elements.append(Paragraph("Savings Bank Account Statement", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    info_data = [
        ["Account No:", "3XXXXXXXXXX9012", "Statement:", "01/01/2026 - 30/06/2026"],
        ["Name:", "RAKESH KUMAR SHARMA", "Branch:", "BANDRA EAST, MUMBAI"],
    ]
    info_table = Table(info_data, colWidths=[80, 160, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    header = ["Date", "Description", "Debit (₹)", "Credit (₹)", "Balance (₹)"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        debit = f"{txn['amount']:,.2f}" if txn["type"] == "debit" else ""
        credit = f"{txn['amount']:,.2f}" if txn["type"] == "credit" else ""
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, txn["desc"][:45], debit, credit, balance])

    table = Table(table_data, colWidths=[65, 220, 80, 80, 80])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.6, 0, 0)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(1.0, 0.95, 0.95)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


def create_axis_statement(transactions, filename):
    """Create Axis-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=25*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=4,
                                  textColor=colors.Color(0.8, 0.1, 0.1))
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("AXIS BANK", title_style))
    elements.append(Paragraph("Savings Account Statement", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    info_data = [
        ["Account No:", "9XXXXXXXXXX3456", "Period:", "01/01/2026 - 30/06/2026"],
        ["Name:", "RAKESH KUMAR SHARMA", "Branch:", "POWAI, MUMBAI"],
    ]
    info_table = Table(info_data, colWidths=[80, 160, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    header = ["Date", "Particulars", "Debit (₹)", "Credit (₹)", "Balance (₹)"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        debit = f"{txn['amount']:,.2f}" if txn["type"] == "debit" else ""
        credit = f"{txn['amount']:,.2f}" if txn["type"] == "credit" else ""
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, txn["desc"][:45], debit, credit, balance])

    table = Table(table_data, colWidths=[65, 220, 80, 80, 80])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.8, 0.1, 0.1)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(1.0, 0.95, 0.95)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


def create_bob_statement(transactions, filename):
    """Create Bank of Baroda-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=25*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=4,
                                  textColor=colors.Color(0, 0.3, 0.6))
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("BANK OF BARODA", title_style))
    elements.append(Paragraph("Savings Bank Account Statement", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    info_data = [
        ["Account No:", "4XXXXXXXXXX7890", "Statement:", "01/01/2026 - 30/06/2026"],
        ["Name:", "RAKESH KUMAR SHARMA", "Branch:", "BORIVALI, MUMBAI"],
    ]
    info_table = Table(info_data, colWidths=[80, 160, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    header = ["Date", "Description", "Amount (₹)", "Type", "Balance (₹)"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        amount = f"{txn['amount']:,.2f}"
        txn_type = "Dr" if txn["type"] == "debit" else "Cr"
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, txn["desc"][:45], amount, txn_type, balance])

    table = Table(table_data, colWidths=[65, 220, 80, 40, 80])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0, 0.3, 0.6)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 0.97, 1.0)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


def create_pnb_statement(transactions, filename):
    """Create PNB-style bank statement PDF."""
    doc = SimpleDocTemplate(filename, pagesize=A4,
                            topMargin=25*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=16, spaceAfter=4,
                                  textColor= colors.Color(0, 0.4, 0.2))
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("PUNJAB NATIONAL BANK", title_style))
    elements.append(Paragraph("Savings Account Statement", subtitle_style))
    elements.append(Spacer(1, 8*mm))

    info_data = [
        ["Account No:", "2XXXXXXXXXX4567", "Period:", "01/01/2026 - 30/06/2026"],
        ["Name:", "RAKESH KUMAR SHARMA", "Branch:", "THANE, MUMBAI"],
    ]
    info_table = Table(info_data, colWidths=[80, 160, 70, 160])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6*mm))

    header = ["Date", "Particulars", "Withdrawal (₹)", "Deposit (₹)", "Balance (₹)"]
    table_data = [header]

    for txn in transactions:
        date_str = txn["date"].strftime("%d/%m/%Y")
        withdrawal = f"{txn['amount']:,.2f}" if txn["type"] == "debit" else ""
        deposit = f"{txn['amount']:,.2f}" if txn["type"] == "credit" else ""
        balance = f"{txn['balance']:,.2f}"
        table_data.append([date_str, txn["desc"][:45], withdrawal, deposit, balance])

    table = Table(table_data, colWidths=[65, 220, 80, 80, 80])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7),
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0, 0.4, 0.2)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.Color(0.8, 0.8, 0.8)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.Color(0.95, 1.0, 0.97)]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elements.append(table)

    doc.build(elements)


# ─── Database Seed ───────────────────────────────────────────────────────────

def seed_database():
    """Seed the database with demo user and analysis data."""
    from app.database import init_db, SessionLocal
    from app.models_db import User, Analysis, Subscription, TransactionRecord, PriceHistory
    from app.auth.manager import get_password_hash

    init_db()
    session = SessionLocal()

    try:
        # Check if demo user exists
        demo_user = session.query(User).filter(User.email == "demo@subguard.in").first()
        if demo_user:
            print("Demo user already exists. Skipping seed.")
            return

        # Create demo user
        demo_user = User(
            email="demo@subguard.in",
            hashed_password=get_password_hash("demo1234"),
            is_active=True,
        )
        session.add(demo_user)
        session.commit()
        session.refresh(demo_user)

        print(f"Created demo user: demo@subguard.in / demo1234")

        # Create analyses for each bank
        banks = [
            ("sbi", "State Bank of India"),
            ("hdfc", "HDFC Bank"),
            ("icici", "ICICI Bank"),
            ("axis", "Axis Bank"),
            ("bob", "Bank of Baroda"),
            ("pnb", "Punjab National Bank"),
        ]

        for i, (bank_code, bank_name) in enumerate(banks):
            # Create analysis
            analysis = Analysis(
                id=f"demo-analysis-{bank_code}",
                user_id=demo_user.id,
                status="completed",
                total_monthly_leak=round(random.uniform(2000, 8000), 2),
                overall_score=random.randint(40, 75),
                created_at=datetime(2026, 6, 15) + timedelta(days=i),
            )
            session.add(analysis)
            session.commit()
            session.refresh(analysis)

            # Add subscriptions for this analysis (4-6 random ones)
            num_subs = random.randint(4, 6)
            selected_subs = random.sample(SUBSCRIPTIONS, num_subs)

            for sub in selected_subs:
                subscription = Subscription(
                    id=f"demo-sub-{bank_code}-{sub['merchant'].lower().replace(' ', '-')}",
                    analysis_id=analysis.id,
                    merchant=sub["merchant"],
                    amount=sub["amount"],
                    frequency=sub["frequency"],
                    category=sub["category"],
                    leak_score=random.randint(20, 85),
                    action=random.choice(["keep", "review", "cancel"]),
                    reasoning=f"Recurring {sub['frequency']} charge for {sub['merchant']}. Consider if you still use this service actively.",
                    price_trend=random.choice(["stable", "increasing", "decreasing"]),
                    duration_months=random.randint(3, 24),
                    price_increases=random.randint(0, 3),
                )
                session.add(subscription)

                # Add price history
                for month_offset in range(6):
                    price_history = PriceHistory(
                        subscription_id=subscription.id,
                        amount=sub["amount"] + random.randint(-50, 100),
                        recorded_at=datetime(2026, 1, 1) + timedelta(days=30 * month_offset),
                        source_analysis_id=analysis.id,
                    )
                    session.add(price_history)

            # Add sample transactions
            transactions = generate_transactions(num_transactions=20,
                                                 start_date=datetime(2026, 1, 1),
                                                 end_date=datetime(2026, 6, 30))
            for txn in transactions[:20]:
                transaction = TransactionRecord(
                    analysis_id=analysis.id,
                    date=txn["date"],
                    amount=txn["amount"],
                    description=txn["desc"],
                    category="subscription" if "subscription" in txn["desc"].lower() else "regular",
                    is_recurring="subscription" in txn["desc"].lower(),
                )
                session.add(transaction)

            print(f"Created analysis for {bank_name}: {num_subs} subscriptions, 20 transactions")

        session.commit()
        print("\nDatabase seeded successfully!")
        print("Login: demo@subguard.in / demo1234")

    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        session.close()


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    output_dir = os.path.join(os.path.dirname(__file__), "sample_statements")
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("SubGuard Demo Data Generator")
    print("=" * 60)

    # Generate PDFs for all 6 banks
    banks = [
        ("sbi", "SBI", create_sbi_statement),
        ("hdfc", "HDFC", create_hdfc_statement),
        ("icici", "ICICI", create_icici_statement),
        ("axis", "Axis", create_axis_statement),
        ("bob", "BOB", create_bob_statement),
        ("pnb", "PNB", create_pnb_statement),
    ]

    print("\nGenerating sample bank statements...")
    for bank_code, bank_name, create_func in banks:
        filename = os.path.join(output_dir, f"{bank_code}_statement_demo.pdf")
        transactions = generate_transactions(num_transactions=40)
        create_func(transactions, filename)
        print(f"  Created: {filename}")

    # Seed database
    print("\nSeeding database with demo data...")
    seed_database()

    print("\n" + "=" * 60)
    print("Done! Sample PDFs are in sample_statements/")
    print("Login: demo@subguard.in / demo1234")
    print("=" * 60)


if __name__ == "__main__":
    main()
