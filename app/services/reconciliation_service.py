import logging
from datetime import datetime, timedelta
from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.audit_log import AuditLog

logger = logging.getLogger("dit_forms.reconciliation")


async def generate_daily_reconciliation() -> dict:
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)

    recent_payments = await Payment.find({
        "paidAt": {"$gte": yesterday, "$lt": today},
    }).to_list()

    issues: list[dict] = []

    for p in recent_payments:
        order = await HandoutOrder.find_one({"invoiceNumber": getattr(p, "invoiceNumber", None)})
        if order and p.amount > order.invoice.totalAmount + 0.01:
            issues.append({
                "type": "overpayment",
                "severity": "high",
                "payment_id": str(p.id),
                "amount": p.amount,
                "expected": order.invoice.totalAmount,
            })

    invoice_numbers = await HandoutOrder.distinct("invoiceNumber")
    for p in recent_payments:
        inv_num = getattr(p, "invoiceNumber", None)
        if inv_num and inv_num not in invoice_numbers:
            issues.append({
                "type": "orphan_payment",
                "severity": "critical",
                "payment_id": str(p.id),
                "invoice_number": inv_num,
            })

    report = {
        "date": today.strftime("%Y-%m-%d"),
        "total_payments": len(recent_payments),
        "total_issues": len(issues),
        "critical": sum(1 for i in issues if i["severity"] == "critical"),
        "high": sum(1 for i in issues if i["severity"] == "high"),
        "issues": issues[:50],
    }

    await AuditLog(
        user_id="system-reconciliation",
        user_role="system",
        action="DAILY_RECONCILIATION",
        resource_type="ReconciliationReport",
        metadata=report,
        success=report["critical"] == 0,
    ).insert()

    logger.info(f"[RECONCILIATION] {report['date']}: {len(issues)} issues ({report['critical']} critical)")
    return report
