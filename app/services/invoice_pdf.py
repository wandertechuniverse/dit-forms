import hashlib
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from app.models.handout import HandoutOrder
from app.models.payment import Payment


async def generate_invoice_pdf(invoice_number: str) -> bytes:
    order = await HandoutOrder.find_one({"invoiceNumber": invoice_number})
    if not order:
        raise ValueError(f"Invoice {invoice_number} not found")

    payments = await Payment.find({"handoutOrderId": str(order.id)}).to_list()
    total_paid = sum(p.amount for p in payments)
    remaining = max(0, order.invoice.totalAmount - total_paid)

    data_str = f"{order.invoiceNumber}|{order.student.idNumberSnapshot}|{order.invoice.totalAmount}|{total_paid}"
    integrity_hash = hashlib.sha256(data_str.encode()).hexdigest()[:12].upper()

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm, topMargin=25 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title2", parent=styles["Heading1"], fontSize=22, spaceAfter=8, textColor="#1E293B")
    subtitle_style = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, textColor="#64748B", spaceAfter=15)
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=9, textColor="#64748B")
    value_style = ParagraphStyle("Value", parent=styles["Normal"], fontSize=11, textColor="#0F172A", fontName="Helvetica-Bold")
    hash_style = ParagraphStyle("Hash", parent=styles["Code"], fontSize=7, textColor="#94A3B8")

    elements = [
        Paragraph("DIT TRACKER", title_style),
        Paragraph(f"Payment Receipt \u2022 Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style),
        Table([
            [Paragraph("Student ID", label_style), Paragraph(order.student.idNumberSnapshot or "N/A", value_style)],
            [Paragraph("Student Name", label_style), Paragraph(order.student.fullNameSnapshot, value_style)],
            [Paragraph("Invoice Number", label_style), Paragraph(order.invoiceNumber or "N/A", value_style)],
            [Paragraph("Term", label_style), Paragraph(order.termId, value_style)],
        ], colWidths=[40 * mm, 120 * mm], style=TableStyle([
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ])),
        Spacer(1, 15),
        Paragraph("CHARGES", styles["Heading2"]),
        Spacer(1, 5),
    ]

    item_rows = [["Description", "Qty", "Unit Price", "Amount"]]
    for item in order.lines:
        item_rows.append([
            getattr(item, "courseId", "N/A"),
            str(getattr(item, "qty", 1)),
            f"GH\u20b5 {getattr(item, 'unitPrice', 0):,.2f}",
            f"GH\u20b5 {getattr(item, 'lineTotal', 0):,.2f}",
        ])

    item_rows.append(["", "", "SUBTOTAL", f"GH\u20b5 {order.invoice.totalAmount:,.2f}"])
    item_rows.append(["", "", "AMOUNT PAID", f"GH\u20b5 {total_paid:,.2f}"])
    item_rows.append(["", "", "BALANCE DUE", f"GH\u20b5 {remaining:,.2f}"])

    elements.append(Table(item_rows, colWidths=[65 * mm, 20 * mm, 30 * mm, 40 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), "#F1F5F9"),
        ("TEXTCOLOR", (0, 0), (-1, 0), "#334155"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, "#E2E8F0"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -4), ["#FFFFFF", "#F8FAFC"]),
        ("BACKGROUND", (0, -3), (-1, -1), "#F0FDF4"),
        ("FONTNAME", (2, -3), (3, -1), "Helvetica-Bold"),
    ])))

    elements.extend([
        Spacer(1, 20),
        Paragraph(f"VERIFICATION HASH: {integrity_hash}", hash_style),
        Spacer(1, 5),
    ])

    qr_drawing = Drawing(30 * mm, 30 * mm)
    qr = QrCodeWidget(f"https://dit-tracker.vercel.app/verify?hash={integrity_hash}")
    qr_drawing.add(qr)
    elements.append(qr_drawing)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
