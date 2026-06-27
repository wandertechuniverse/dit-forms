from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.models.handout import HandoutOrder, HandoutLine, InvoiceInfo, StudentSnapshot
from app.models.submission import FormSubmission


class HandoutValidationError(Exception):
    pass


class DuplicateHandoutInfo:
    def __init__(self, courseId: str, handoutItemId: str, existingOrderId: str):
        self.courseId = courseId
        self.handoutItemId = handoutItemId
        self.existingOrderId = existingOrderId


async def generate_invoice_number(termId: str) -> str:
    last = await HandoutOrder.find(
        {"termId": termId}
    ).sort("-createdAt").limit(1).to_list()
    seq = 1
    if last and last[0].invoiceNumber:
        try:
            seq = int(last[0].invoiceNumber.split("-")[-1]) + 1
        except (IndexError, ValueError):
            pass
    return f"INV-{termId}-{seq:04d}"


def _extract_handout_payload(answers: Dict[str, Any]) -> Tuple[datetime, List[Dict]]:
    given_raw = answers.get("givenOutAt")
    if not given_raw:
        raise HandoutValidationError("Missing required field: givenOutAt")

    if isinstance(given_raw, str):
        try:
            given_out_at = datetime.fromisoformat(given_raw.replace("Z", "+00:00"))
        except ValueError:
            try:
                given_out_at = datetime.strptime(given_raw, "%Y-%m-%d")
            except ValueError:
                raise HandoutValidationError(f"Invalid givenOutAt format: {given_raw}")
    elif isinstance(given_raw, datetime):
        given_out_at = given_raw
    else:
        raise HandoutValidationError("givenOutAt must be a date or datetime")

    handouts = answers.get("handouts")
    if not handouts or not isinstance(handouts, list):
        raise HandoutValidationError("Missing or invalid 'handouts' array in submission")
    if len(handouts) == 0:
        raise HandoutValidationError("handouts array must contain at least one item")

    validated_lines: List[Dict] = []
    for i, line in enumerate(handouts):
        if not isinstance(line, dict):
            raise HandoutValidationError(f"handouts[{i}] must be an object")
        for required in ("courseId", "handoutItemId", "qty", "unitPrice"):
            if required not in line:
                raise HandoutValidationError(f"handouts[{i}] missing '{required}'")
        if not isinstance(line["qty"], int) or line["qty"] <= 0:
            raise HandoutValidationError(f"handouts[{i}].qty must be a positive integer")
        if not isinstance(line["unitPrice"], (int, float)) or line["unitPrice"] < 0:
            raise HandoutValidationError(f"handouts[{i}].unitPrice must be >= 0")
        validated_lines.append({
            "courseId": str(line["courseId"]),
            "handoutItemId": str(line["handoutItemId"]),
            "qty": int(line["qty"]),
            "unitPrice": float(line["unitPrice"]),
        })

    return given_out_at, validated_lines


async def find_duplicate_handouts(
    programClassId: str,
    termId: str,
    student_id: Optional[str],
    id_number_snapshot: str,
    lines: List[Dict],
) -> List[DuplicateHandoutInfo]:
    student_query_value = student_id or id_number_snapshot
    student_query_field = (
        "student.matchedStudentId" if student_id else "student.idNumberSnapshot"
    )

    duplicates: List[DuplicateHandoutInfo] = []
    for line in lines:
        existing = await HandoutOrder.find_one(
            {
                "programClassId": programClassId,
                "termId": termId,
                student_query_field: student_query_value,
                "lines.courseId": line["courseId"],
            }
        )
        if existing:
            duplicates.append(
                DuplicateHandoutInfo(
                    courseId=line["courseId"],
                    handoutItemId=line["handoutItemId"],
                    existingOrderId=str(existing.id),
                )
            )
    return duplicates


async def create_handout_order_from_submission(
    submission: FormSubmission,
    allow_partial: bool = False,
) -> HandoutOrder:
    given_out_at, validated_lines = _extract_handout_payload(submission.answers)

    duplicates = await find_duplicate_handouts(
        programClassId=submission.programClassId,
        termId=submission.termId,
        student_id=submission.studentMatch.matchedStudentId,
        id_number_snapshot=submission.studentMatch.idNumberSnapshot,
        lines=validated_lines,
    )

    if duplicates:
        if not allow_partial:
            dup_details = ", ".join(
                f"{d.courseId} (existing order: {d.existingOrderId})"
                for d in duplicates
            )
            raise HandoutValidationError(
                f"Duplicate handout(s) detected. A student may only receive "
                f"one handout per course per term. "
                f"Duplicate courses: {dup_details}"
            )
        else:
            dup_course_ids = {d.courseId for d in duplicates}
            validated_lines = [
                line for line in validated_lines
                if line["courseId"] not in dup_course_ids
            ]
            if not validated_lines:
                raise HandoutValidationError(
                    "All handout lines are duplicates. No new order created."
                )

    handout_lines: List[HandoutLine] = []
    total_amount = 0.0
    for line in validated_lines:
        line_total = round(line["qty"] * line["unitPrice"], 2)
        total_amount += line_total
        handout_lines.append(
            HandoutLine(
                courseId=line["courseId"],
                handoutItemId=line["handoutItemId"],
                qty=line["qty"],
                unitPrice=line["unitPrice"],
                lineTotal=line_total,
            )
        )

    total_amount = round(total_amount, 2)

    invoice_number = await generate_invoice_number(submission.termId)

    order = HandoutOrder(
        formSubmissionId=str(submission.id),
        programClassId=submission.programClassId,
        termId=submission.termId,
        student=StudentSnapshot(
            matchedStudentId=submission.studentMatch.matchedStudentId,
            fullNameSnapshot=submission.studentMatch.fullNameSnapshot,
            idNumberSnapshot=submission.studentMatch.idNumberSnapshot,
        ),
        givenOutAt=given_out_at,
        invoice=InvoiceInfo(
            invoiceStatus="unpaid",
            totalAmount=total_amount,
        ),
        invoiceNumber=invoice_number,
        lines=handout_lines,
    )
    await order.insert()
    return order
