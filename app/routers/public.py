import re
import json
import asyncio
import logging
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.models.student import Student
from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.user import User
from app.core.deps import require_role

logger = logging.getLogger("dit_forms.sse")

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/status")
async def get_student_status(idNumber: str = Query(..., min_length=3, max_length=20)):
    clean_id = idNumber.strip().upper()
    if not re.match(r'^[A-Z0-9]+$', clean_id):
        raise HTTPException(400, "Invalid ID format. Use letters and numbers only.")

    student = await Student.find_one({"idNumber": clean_id})
    if not student:
        return {"found": False, "message": "No records found. Please verify your student ID."}

    orders = await HandoutOrder.find(
        {"student.idNumberSnapshot": clean_id}
    ).to_list()
    payments = await Payment.find().to_list()

    order_ids = {str(o.id) for o in orders}
    student_payments = [p for p in payments if p.handoutOrderId in order_ids]

    total_invoiced = sum(o.invoice.totalAmount for o in orders)
    total_paid = sum(p.amount for p in student_payments)
    pending = max(0, total_invoiced - total_paid)

    latest_receipt = None
    if student_payments:
        latest = max(student_payments, key=lambda p: p.paidAt)
        latest_receipt = f"/public/receipt/{latest.id}"

    return {
        "found": True,
        "studentName": student.fullName,
        "programClass": student.programClassId,
        "term": student.termId,
        "invoiceCount": len(orders),
        "totalInvoiced": total_invoiced,
        "totalPaid": total_paid,
        "pendingBalance": pending,
        "paymentCount": len(student_payments),
        "latestReceiptUrl": latest_receipt,
        "lastUpdated": max(
            [p.paidAt for p in student_payments] + [o.createdAt for o in orders],
            default=None,
        ),
    }


_payment_subscribers: dict[str, list[asyncio.Queue]] = {}

_sse_stats = {
    "total_connections": 0,
    "total_disconnections": 0,
    "total_messages_sent": 0,
    "peak_concurrent": 0,
    "errors": 0,
    "history": [],
}


def _get_active_count() -> int:
    return sum(len(qs) for qs in _payment_subscribers.values())


def _record_event(event_type: str, details: dict = None):
    _sse_stats["history"].append({
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "active": _get_active_count(),
        **(details or {}),
    })
    if len(_sse_stats["history"]) > 500:
        _sse_stats["history"] = _sse_stats["history"][-250:]


async def notify_payment_update(student_id: str, update_data: dict):
    clean_id = student_id.strip().upper()
    if clean_id in _payment_subscribers:
        msg = {"type": "payment_recorded", "timestamp": datetime.utcnow().isoformat(), **update_data}
        for q in _payment_subscribers[clean_id]:
            try:
                await q.put(msg)
                _sse_stats["total_messages_sent"] += 1
            except Exception:
                _sse_stats["errors"] += 1


@router.get("/status/stream/{idNumber}")
async def stream_payment_updates(idNumber: str):
    clean_id = idNumber.strip().upper()

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()
        _payment_subscribers.setdefault(clean_id, []).append(queue)
        _sse_stats["total_connections"] += 1
        active = _get_active_count()
        if active > _sse_stats["peak_concurrent"]:
            _sse_stats["peak_concurrent"] = active
        _record_event("connect", {"student_id": clean_id})
        logger.info(f"[SSE] Connected: {clean_id} (active: {active})")

        try:
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.utcnow().isoformat(), 'active_connections': active})}\n\n"
            while True:
                update = await queue.get()
                yield f"data: {json.dumps(update)}\n\n"
                _sse_stats["total_messages_sent"] += 1
        except asyncio.CancelledError:
            pass
        except Exception as e:
            _sse_stats["errors"] += 1
            logger.warning(f"[SSE] Error for {clean_id}: {e}")
        finally:
            if clean_id in _payment_subscribers:
                try:
                    _payment_subscribers[clean_id].remove(queue)
                except ValueError:
                    pass
                if not _payment_subscribers[clean_id]:
                    del _payment_subscribers[clean_id]
            _sse_stats["total_disconnections"] += 1
            _record_event("disconnect", {"student_id": clean_id})
            logger.info(f"[SSE] Disconnected: {clean_id} (active: {_get_active_count()})")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.get("/sse/stats")
async def get_sse_stats(current_user: User = Depends(require_role("admin"))):
    active = _get_active_count()
    total = _sse_stats["total_connections"]
    drop_rate = (_sse_stats["total_disconnections"] / total * 100) if total > 0 else 0
    recent_events = [e for e in _sse_stats["history"] if e["type"] == "disconnect"]
    recent_drops = len([e for e in recent_events[-20:]])

    alert_level = "healthy"
    if _sse_stats["errors"] > 10:
        alert_level = "critical"
    elif _sse_stats["errors"] > 5 or recent_drops > 10:
        alert_level = "warning"

    return {
        "active_connections": active,
        "total_connections": total,
        "total_disconnections": _sse_stats["total_disconnections"],
        "total_messages_sent": _sse_stats["total_messages_sent"],
        "peak_concurrent": _sse_stats["peak_concurrent"],
        "error_count": _sse_stats["errors"],
        "drop_rate_pct": round(drop_rate, 1),
        "alert_level": alert_level,
        "recent_events": _sse_stats["history"][-20:],
        "subscribers_by_student": {k: len(v) for k, v in _payment_subscribers.items()},
    }
