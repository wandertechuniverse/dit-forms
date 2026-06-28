import re
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from app.models.student import Student
from app.models.handout import HandoutOrder
from app.models.payment import Payment

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


async def notify_payment_update(student_id: str, update_data: dict):
    clean_id = student_id.strip().upper()
    if clean_id in _payment_subscribers:
        msg = {"type": "payment_recorded", "timestamp": datetime.utcnow().isoformat(), **update_data}
        for q in _payment_subscribers[clean_id]:
            await q.put(msg)


@router.get("/status/stream/{idNumber}")
async def stream_payment_updates(idNumber: str):
    clean_id = idNumber.strip().upper()

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()
        _payment_subscribers.setdefault(clean_id, []).append(queue)
        try:
            yield f"data: {json.dumps({'type': 'connected', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
            while True:
                update = await queue.get()
                yield f"data: {json.dumps(update)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if clean_id in _payment_subscribers:
                _payment_subscribers[clean_id].remove(queue)
                if not _payment_subscribers[clean_id]:
                    del _payment_subscribers[clean_id]

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
