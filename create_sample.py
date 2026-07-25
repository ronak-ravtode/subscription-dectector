from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
import os

EDGE_CASES_DIR = os.path.join("sample_statements", "edge_cases")


def ensure_edge_cases_dir():
    os.makedirs(EDGE_CASES_DIR, exist_ok=True)


def draw_statement_header(c, title, account_info, period, width, height):
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "FIRST NATIONAL BANK")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, title)
    c.drawString(50, height - 85, f"Account: {account_info} | Statement Period: {period}")

    c.setFont("Helvetica-Bold", 11)
    y = height - 130
    c.drawString(50, y, "Date")
    c.drawString(150, y, "Description")
    c.drawString(420, y, "Amount")
    c.line(50, y - 5, 550, y - 5)
    return y - 25


def draw_transactions_table(c, transactions, start_y, width, height, extra_cols=None):
    y = start_y
    c.setFont("Helvetica", 10)

    if extra_cols:
        for i, col_name in enumerate(extra_cols):
            c.drawString(420 + (i + 1) * 60, start_y + 15, col_name)

    for txn in transactions:
        if y < 80:
            c.showPage()
            c.setFont("Helvetica-Bold", 11)
            y = height - 50
            c.drawString(50, y, "Date")
            c.drawString(150, y, "Description")
            c.drawString(420, y, "Amount")
            if extra_cols:
                for i, col_name in enumerate(extra_cols):
                    c.drawString(420 + (i + 1) * 60, y, col_name)
            c.line(50, y - 5, 550, y - 5)
            y -= 25
            c.setFont("Helvetica", 10)

        c.drawString(50, y, txn.get("date", ""))
        desc = txn.get("description", "")
        if len(desc) > 40:
            desc = desc[:40] + "..."
        c.drawString(150, y, desc)

        amount_str = txn.get("amount_str", "")
        if not amount_str:
            amount = txn.get("amount", 0)
            if amount < 0:
                c.setFillColorRGB(0.8, 0, 0)
                amount_str = f"-${abs(amount):.2f}"
            else:
                c.setFillColorRGB(0, 0.5, 0)
                amount_str = f"${amount:.2f}"
        else:
            if amount_str.startswith("-") or amount_str.startswith("("):
                c.setFillColorRGB(0.8, 0, 0)
            elif amount_str.startswith("$") or not amount_str.startswith("-"):
                c.setFillColorRGB(0, 0.5, 0)
            else:
                c.setFillColorRGB(0, 0, 0)

        c.drawString(420, y, amount_str)
        c.setFillColorRGB(0, 0, 0)

        if extra_cols:
            for i, key in enumerate(extra_cols):
                val = txn.get(key.lower().replace(" ", "_").replace("#", ""), "")
                c.drawString(420 + (i + 1) * 60, y, str(val))

        y -= 20

    return y


def draw_summary(c, deposits, withdrawals, balance, y):
    c.line(50, y, 550, y)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y - 20, "Monthly Summary")
    c.setFont("Helvetica", 10)
    c.drawString(50, y - 40, f"Total Deposits: ${deposits:,.2f}")
    c.drawString(50, y - 55, f"Total Withdrawals: ${withdrawals:,.2f}")
    c.drawString(50, y - 75, f"Ending Balance: ${balance:,.2f}")


def create_edge_case_date_formats():
    output_path = os.path.join(EDGE_CASES_DIR, "date_formats.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Date Formats",
        "****4521",
        "01/01/2026 - 03/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "15-01-2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "2026-01-20", "description": "ADOBE CREATIVE", "amount": -54.99},
        {"date": "Jan 25, 2026", "description": "APPLE ICLOUD", "amount": -2.99},
        {"date": "1/5/2026", "description": "HULU STREAMING", "amount": -12.99},
        {"date": "01/10/26", "description": "DISNEY PLUS", "amount": -7.99},
        {"date": "2026/02/01", "description": "YOUTUBE PREMIUM", "amount": -11.99},
        {"date": "15 Feb 2026", "description": "GITHUB PRO", "amount": -4.00},
        {"date": "02/28/2026", "description": "NIKON CLOUD", "amount": -1.99},
        {"date": "Mar 01, 2026", "description": "DROPBOX PLUS", "amount": -9.99},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 132.91, 3367.09, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_amount_formats():
    output_path = os.path.join(EDGE_CASES_DIR, "amount_formats.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Amount Formats",
        "****7890",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "STANDARD CHARGE", "amount": -15.99},
        {"date": "01/03/2026", "description": "ACCOUNTING NEGATIVE", "amount_str": "(15.99)"},
        {"date": "01/05/2026", "description": "LARGE AMOUNT", "amount": -1299.99},
        {"date": "01/07/2026", "description": "NO DECIMALS", "amount_str": "-15"},
        {"date": "01/08/2026", "description": "LEADING ZERO", "amount_str": "$0.99"},
        {"date": "01/10/2026", "description": "CURRENCY CODE", "amount_str": "USD 45.20"},
        {"date": "01/12/2026", "description": "TRAILING NEGATIVE", "amount_str": "25.99-"},
        {"date": "01/15/2026", "description": "DIRECT DEPOSIT", "amount_str": "$3,500.00"},
        {"date": "01/20/2026", "description": "SMALL PURCHASE", "amount": -0.01},
        {"date": "01/25/2026", "description": "MASSIVE PURCHASE", "amount_str": "-1,000,000.00"},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 3500.00, 1383.97, 2116.03, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_descriptions():
    output_path = os.path.join(EDGE_CASES_DIR, "descriptions.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Description Anomalies",
        "****1234",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "NETFLIX.COM *STREAMING SERVICE", "amount": -15.99},
        {"date": "01/03/2026", "description": "STARBUCKS #12345 / DOWNTOWN", "amount": -5.75},
        {"date": "01/05/2026", "description": "uber eats - dinner delivery", "amount": -23.45},
        {"date": "01/07/2026", "description": "   SPOTIFY   ", "amount": -9.99},
        {"date": "01/08/2026", "description": "AMAZON MKTPL*2K4JF8...", "amount": -29.99},
        {"date": "01/10/2026", "description": "O", "amount": -1.00},
        {"date": "01/12/2026", "description": " merchant with leading space", "amount": -12.50},
        {"date": "01/15/2026", "description": "merchant with trailing space ", "amount": -8.99},
        {"date": "01/20/2026", "description": "MICROSOFT 365 SUBSCRIPTION MONTHLY PLAN", "amount": -6.99},
        {"date": "01/25/2026", "description": "a]b[c", "amount": -3.50},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 118.15, 3381.85, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_subscription_patterns():
    output_path = os.path.join(EDGE_CASES_DIR, "subscription_patterns.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Subscription Patterns",
        "****5678",
        "01/01/2026 - 04/30/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/05/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "02/05/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "03/05/2026", "description": "NETFLIX.COM", "amount": -18.99},
        {"date": "01/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "02/14/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "03/16/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "01/10/2026", "description": "ADOBE CREATIVE CLOUD", "amount": -54.99},
        {"date": "02/10/2026", "description": "ADOBE CREATIVE CLOUD", "amount": -0.00},
        {"date": "01/01/2026", "description": "APPLE ICLOUD", "amount": -2.99},
        {"date": "02/01/2026", "description": "APPLE ICLOUD", "amount": -2.99},
        {"date": "03/01/2026", "description": "APPLE ICLOUD", "amount": -2.99},
        {"date": "04/01/2026", "description": "APPLE ICLOUD", "amount": -2.99},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 145.91, 3354.09, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_structural():
    output_path = os.path.join(EDGE_CASES_DIR, "structural.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Structural Edge Cases",
        "****9999",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "01/03/2026", "description": "", "amount": -5.00},
        {"date": "01/05/2026", "description": "AMAZON MARKETPLACE", "amount_str": ""},
        {"date": "01/07/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "01/07/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "01/10/2026", "description": "ZERO CHARGE", "amount": 0.00},
        {"date": "", "description": "", "amount": 0.00},
        {"date": "01/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "01/20/2026", "description": "ADOBE CREATIVE CLOUD", "amount": -54.99},
        {"date": "01/25/2026", "description": "GROCERY STORE", "amount": -67.45},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 185.41, 3314.59, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_special():
    output_path = os.path.join(EDGE_CASES_DIR, "special.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Special Encoding",
        "****2468",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "CAFÉ RÉSUMÉ", "amount": -12.50},
        {"date": "01/05/2026", "description": "東京スシロー", "amount": -25.00},
        {"date": "01/07/2026", "description": "Café del Mar", "amount": -45.00},
        {"date": "01/08/2026", "description": "Naïve Café", "amount": -8.99},
        {"date": "01/10/2026", "description": "Ñoño Restaurant", "amount": -32.50},
        {"date": "01/12/2026", "description": "Über", "amount": -15.00},
        {"date": "01/15/2026", "description": "Crème Brûlée Shop", "amount": -6.75},
        {"date": "01/18/2026", "description": "Ñoquis del 29", "amount": -18.00},
        {"date": "01/22/2026", "description": "Zürich Bakery", "amount": -4.50},
        {"date": "01/28/2026", "description": "São Paulo Coffee", "amount": -7.25},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 175.49, 3324.51, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_multi_page():
    output_path = os.path.join(EDGE_CASES_DIR, "multi_page.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Multi-Page Statement",
        "****1357",
        "01/01/2026 - 12/31/2026",
        width,
        height,
    )

    merchants = [
        "NETFLIX.COM", "SPOTIFY PREMIUM", "AMAZON MARKETPLACE", "ADOBE CREATIVE CLOUD",
        "APPLE ICLOUD", "GOOGLE STORAGE", "MICROSOFT 365", "HULU STREAMING",
        "DISNEY PLUS", "YOUTUBE PREMIUM", "GITHUB PRO", "DROPBOX PLUS",
        "SLACK WORKSPACE", "NOTION APP", "FIGMA PRO", "CANVA PRO",
        "UBER EATS", "DOORDASH", "GRUBHUB", "LYFT",
        "SHELL OIL", "BP GAS", "COSTCO", "WALMART", "TARGET",
        "STARBUCKS", "DUNKIN DONUTS", "CHIPOTLE", "PANERA BREAD", "SUBWAY",
    ]

    transactions = []
    total_withdrawals = 0
    for i, merchant in enumerate(merchants):
        amount = -(10 + (i % 20) * 2.5)
        total_withdrawals += abs(amount)
        transactions.append({
            "date": f"01/{(i % 28) + 1:02d}/2026",
            "description": merchant,
            "amount": amount,
        })

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 3600.00, total_withdrawals, 3600.00 - total_withdrawals, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_memo_fields():
    output_path = os.path.join(EDGE_CASES_DIR, "memo_fields.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Memo/Reference Fields",
        "****8642",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    c.setFont("Helvetica-Bold", 9)
    c.drawString(430, y + 15, "Ref #")
    c.drawString(490, y + 15, "Balance")
    c.setFont("Helvetica", 10)

    transactions = [
        {"date": "01/02/2026", "description": "NETFLIX.COM", "amount": -15.99, "ref": "TXN001", "balance": "3484.01"},
        {"date": "01/03/2026", "description": "DEPOSIT", "amount": 3500.00, "ref": "DD001", "balance": "6984.01"},
        {"date": "01/05/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99, "ref": "TXN002", "balance": "6974.02"},
        {"date": "01/07/2026", "description": "AMAZON MARKETPLACE", "amount": -29.99, "ref": "TXN003", "balance": "6944.03"},
        {"date": "01/08/2026", "description": "ADOBE CREATIVE CLOUD", "amount": -54.99, "ref": "", "balance": "6889.04"},
        {"date": "01/10/2026", "description": "APPLE ICLOUD", "amount": -2.99, "ref": "TXN004", "balance": "6886.05"},
        {"date": "01/12/2026", "description": "GOOGLE STORAGE", "amount": -1.99, "ref": "TXN005", "balance": "6884.06"},
        {"date": "01/15/2026", "description": "STARBUCKS", "amount": -5.75, "ref": "", "balance": "6878.31"},
        {"date": "01/20/2026", "description": "HULU STREAMING", "amount": -12.99, "ref": "TXN006", "balance": "6865.32"},
        {"date": "01/25/2026", "description": "DISNEY PLUS", "amount": -7.99, "ref": "TXN007", "balance": "6857.33"},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 3500.00, 142.67, 6857.33, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_fees():
    output_path = os.path.join(EDGE_CASES_DIR, "fees.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Fee/Charge Variations",
        "****3579",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "OVERDRAFT FEE", "amount": -35.00},
        {"date": "01/05/2026", "description": "WIRE TRANSFER FEE", "amount": -25.00},
        {"date": "01/07/2026", "description": "FOREIGN TXN FEE", "amount": -1.50},
        {"date": "01/08/2026", "description": "SERVICE CHARGE", "amount": -12.00},
        {"date": "01/10/2026", "description": "ATM WITHDRAWAL FEE", "amount": -3.00},
        {"date": "01/12/2026", "description": "LATE FEE", "amount": -25.00},
        {"date": "01/15/2026", "description": "BAL INQ FEE", "amount": -2.50},
        {"date": "01/18/2026", "description": "STOP PAYMENT", "amount": -30.00},
        {"date": "01/20/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "01/25/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 160.98, 3339.02, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_ocr_artifacts():
    output_path = os.path.join(EDGE_CASES_DIR, "ocr_artifacts.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: OCR Artifacts",
        "****4680",
        "01/01/2026 - 01/31/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/02/2026", "description": "N E T F L I X . C O M", "amount": -15.99},
        {"date": "01/03/2026", "description": "S P O T I F Y", "amount": -9.99},
        {"date": "01/05/2026", "description": "NETFLI\nX.COM", "amount": -15.99},
        {"date": "01/07/2026", "description": "AMAZON MKTPL", "amount": -29.99},
        {"date": "01/08/2026", "description": "ADOBE   CREATIVE   CLOUD", "amount": -54.99},
        {"date": "01/10/2026", "description": "APPLE lCLOUD", "amount": -2.99},
        {"date": "01/12/2026", "description": "GO0GLE STORAGE", "amount": -1.99},
        {"date": "01/15/2026", "description": "STARBUCK5", "amount": -5.75},
        {"date": "01/20/2026", "description": "HULU STREAM1NG", "amount": -12.99},
        {"date": "01/25/2026", "description": "D1SNEY PLUS", "amount": -7.99},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 0, 157.66, 3342.34, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_autopay_cancellation():
    output_path = os.path.join(EDGE_CASES_DIR, "autopay_cancellation.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    y = draw_statement_header(
        c,
        "Edge Case: Autopay Cancellation",
        "****1122",
        "01/01/2026 - 04/30/2026",
        width,
        height,
    )

    transactions = [
        {"date": "01/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "02/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "02/20/2026", "description": "NETFLIX REFUND", "amount_str": "$15.99"},
        {"date": "03/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
        {"date": "03/20/2026", "description": "NETFLIX REFUND", "amount_str": "$15.99"},
        {"date": "03/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "04/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        {"date": "04/15/2026", "description": "NETFLIX.COM", "amount": 0.00},
    ]

    y = draw_transactions_table(c, transactions, y, width, height)
    draw_summary(c, 31.98, 67.95, 3531.97 - 67.95, y)

    c.save()
    print(f"Created: {output_path}")


def create_edge_case_combined():
    output_path = os.path.join("sample_statements", "edge_cases_all.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    sections = [
        ("1. Date Formats", [
            {"date": "01/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
            {"date": "15-01-2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
            {"date": "2026-01-20", "description": "ADOBE CREATIVE", "amount": -54.99},
            {"date": "Jan 25, 2026", "description": "APPLE ICLOUD", "amount": -2.99},
            {"date": "1/5/2026", "description": "HULU STREAMING", "amount": -12.99},
            {"date": "01/10/26", "description": "DISNEY PLUS", "amount": -7.99},
            {"date": "2026/02/01", "description": "YOUTUBE PREMIUM", "amount": -11.99},
            {"date": "15 Feb 2026", "description": "GITHUB PRO", "amount": -4.00},
        ]),
        ("2. Amount Formats", [
            {"date": "01/02/2026", "description": "STANDARD CHARGE", "amount": -15.99},
            {"date": "01/03/2026", "description": "ACCOUNTING NEGATIVE", "amount_str": "(15.99)"},
            {"date": "01/05/2026", "description": "LARGE AMOUNT", "amount": -1299.99},
            {"date": "01/07/2026", "description": "NO DECIMALS", "amount_str": "-15"},
            {"date": "01/08/2026", "description": "LEADING ZERO", "amount_str": "$0.99"},
        ]),
        ("3. Description Anomalies", [
            {"date": "01/02/2026", "description": "NETFLIX.COM *STREAMING SERVICE", "amount": -15.99},
            {"date": "01/03/2026", "description": "STARBUCKS #12345 / DOWNTOWN", "amount": -5.75},
            {"date": "01/05/2026", "description": "uber eats - dinner delivery", "amount": -23.45},
            {"date": "01/07/2026", "description": "   SPOTIFY   ", "amount": -9.99},
            {"date": "01/08/2026", "description": "AMAZON MKTPL*2K4JF8...", "amount": -29.99},
        ]),
        ("4. Subscription Patterns", [
            {"date": "01/05/2026", "description": "NETFLIX.COM", "amount": -15.99},
            {"date": "02/05/2026", "description": "NETFLIX.COM", "amount": -15.99},
            {"date": "03/05/2026", "description": "NETFLIX.COM", "amount": -18.99},
            {"date": "01/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
            {"date": "02/14/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
            {"date": "03/16/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        ]),
        ("5. Fee/Charge Variations", [
            {"date": "01/02/2026", "description": "OVERDRAFT FEE", "amount": -35.00},
            {"date": "01/05/2026", "description": "WIRE TRANSFER FEE", "amount": -25.00},
            {"date": "01/07/2026", "description": "FOREIGN TXN FEE", "amount": -1.50},
            {"date": "01/10/2026", "description": "ATM WITHDRAWAL FEE", "amount": -3.00},
            {"date": "01/12/2026", "description": "LATE FEE", "amount": -25.00},
        ]),
        ("6. Special Encoding", [
            {"date": "01/02/2026", "description": "CAFÉ RÉSUMÉ", "amount": -12.50},
            {"date": "01/05/2026", "description": "東京スシロー", "amount": -25.00},
            {"date": "01/07/2026", "description": "Café del Mar", "amount": -45.00},
            {"date": "01/08/2026", "description": "Naïve Café", "amount": -8.99},
            {"date": "01/10/2026", "description": "Ñoño Restaurant", "amount": -32.50},
        ]),
        ("7. Autopay Cancellation", [
            {"date": "01/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
            {"date": "02/15/2026", "description": "NETFLIX.COM", "amount": -15.99},
            {"date": "02/20/2026", "description": "NETFLIX REFUND", "amount_str": "$15.99"},
            {"date": "03/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
            {"date": "04/15/2026", "description": "SPOTIFY PREMIUM", "amount": -9.99},
        ]),
    ]

    first_page = True
    for section_title, transactions in sections:
        if not first_page:
            c.showPage()
        first_page = False

        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, height - 50, f"Edge Cases — {section_title}")
        c.setFont("Helvetica", 10)
        c.drawString(50, height - 70, "Account: ****0000 | Combined Edge Case Statement")

        y = draw_statement_header(
            c,
            f"Section: {section_title}",
            "****0000",
            "01/01/2026 - 04/30/2026",
            width,
            height,
        )
        y = draw_transactions_table(c, transactions, y, width, height)

    c.save()
    print(f"Created: {output_path}")


def create_sample_statement():
    output_path = os.path.join("sample_statements", "sample_bank_statement.pdf")
    c = canvas.Canvas(output_path, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "FIRST NATIONAL BANK")
    c.setFont("Helvetica", 10)
    c.drawString(50, height - 70, "Account Statement - January 2024")
    c.drawString(50, height - 85, "Account: ****4521 | Statement Period: 01/01/2024 - 01/31/2024")

    c.setFont("Helvetica-Bold", 11)
    y = height - 130
    c.drawString(50, y, "Date")
    c.drawString(130, y, "Description")
    c.drawString(400, y, "Amount")

    c.line(50, y - 5, 550, y - 5)

    transactions = [
        ("01/02/2024", "NETFLIX.COM", -15.99),
        ("01/03/2024", "GROCERY STORE #123", -67.45),
        ("01/05/2024", "SPOTIFY PREMIUM", -9.99),
        ("01/07/2024", "SHELL OIL", -45.20),
        ("01/10/2024", "NETFLIX.COM", -15.99),
        ("01/12/2024", "AMAZON MARKETPLACE", -29.99),
        ("01/14/2024", "ADOBE CREATIVE CLOUD", -54.99),
        ("01/15/2024", "DIRECT DEPOSIT - EMPLOYER", 3500.00),
        ("01/17/2024", "SPOTIFY PREMIUM", -9.99),
        ("01/19/2024", "STARBUCKS", -5.75),
        ("01/20/2024", "NETFLIX.COM", -15.99),
        ("01/22/2024", "MICROSOFT 365", -6.99),
        ("01/24/2024", "UBER EATS", -23.45),
        ("01/25/2024", "SPOTIFY PREMIUM", -9.99),
        ("01/27/2024", "NETFLIX.COM", -15.99),
        ("01/28/2024", "GOOGLE STORAGE", -2.99),
        ("01/30/2024", "HULU SUBSCRIPTION", -12.99),
    ]

    c.setFont("Helvetica", 10)
    y = height - 160
    for date, desc, amount in transactions:
        c.drawString(50, y, date)
        c.drawString(130, y, desc)
        if amount < 0:
            c.setFillColorRGB(0.8, 0, 0)
            c.drawString(400, y, f"-${abs(amount):.2f}")
        else:
            c.setFillColorRGB(0, 0.5, 0)
            c.drawString(400, y, f"${amount:.2f}")
        c.setFillColorRGB(0, 0, 0)
        y -= 25

    c.line(50, y, 550, y)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y - 20, "Monthly Summary")
    c.setFont("Helvetica", 10)
    c.drawString(50, y - 40, "Total Deposits: $3,500.00")
    c.drawString(50, y - 55, "Total Withdrawals: -$269.34")
    c.drawString(50, y - 75, "Ending Balance: $3,230.66")

    c.save()
    print(f"Sample statement created: {output_path}")


if __name__ == "__main__":
    ensure_edge_cases_dir()
    create_sample_statement()
    create_edge_case_date_formats()
    create_edge_case_amount_formats()
    create_edge_case_descriptions()
    create_edge_case_subscription_patterns()
    create_edge_case_structural()
    create_edge_case_special()
    create_edge_case_multi_page()
    create_edge_case_memo_fields()
    create_edge_case_fees()
    create_edge_case_ocr_artifacts()
    create_edge_case_autopay_cancellation()
    create_edge_case_combined()
    print("\nAll edge case PDFs generated successfully!")
