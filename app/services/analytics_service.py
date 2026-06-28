from typing import Dict, List
from app.models.student import Student
from app.models.group import StudentGroup
from app.models.handout import HandoutOrder
from app.models.payment import Payment
from app.models.submission import FormSubmission


async def get_collection_rate(program_class_id: str, term_id: str) -> Dict:
    orders = await HandoutOrder.find(
        HandoutOrder.programClassId == program_class_id,
        HandoutOrder.termId == term_id,
    ).to_list()

    total_invoiced = sum(o.invoice.totalAmount for o in orders)
    paid_order_ids = set()
    total_paid = 0.0

    payments = await Payment.find().to_list()
    for p in payments:
        if p.handoutOrderId in {str(o.id) for o in orders}:
            total_paid += p.amount
            paid_order_ids.add(p.handoutOrderId)

    paid_count = len(paid_order_ids)
    unpaid_count = len(orders) - paid_count
    rate = (total_paid / total_invoiced * 100) if total_invoiced > 0 else 0.0

    return {
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "collection_rate_pct": round(rate, 1),
        "orders_total": len(orders),
        "orders_paid": paid_count,
        "orders_unpaid": unpaid_count,
    }


async def get_form_completion_rate(program_class_id: str, term_id: str) -> Dict:
    total_students = await Student.find(
        Student.programClassId == program_class_id,
        Student.termId == term_id,
    ).count()

    submitted = await FormSubmission.find(
        FormSubmission.programClassId == program_class_id,
        FormSubmission.termId == term_id,
    ).count()

    rate = (submitted / total_students * 100) if total_students > 0 else 0.0

    return {
        "total_students": total_students,
        "total_submitted": submitted,
        "completion_rate_pct": round(rate, 1),
    }


async def get_group_health(program_class_id: str, term_id: str) -> List[Dict]:
    groups = await StudentGroup.find(
        StudentGroup.programClassId == program_class_id,
        StudentGroup.termId == term_id,
    ).to_list()

    all_students = await Student.find(
        Student.programClassId == program_class_id,
        Student.termId == term_id,
    ).to_list()

    all_orders = await HandoutOrder.find(
        HandoutOrder.programClassId == program_class_id,
        HandoutOrder.termId == term_id,
    ).to_list()

    payments = await Payment.find().to_list()
    paid_order_ids = {p.handoutOrderId for p in payments}

    student_map = {str(s.id): s for s in all_students}
    group_student_map: Dict[str, List[str]] = {}
    for s in all_students:
        for g_name in s.groups:
            group_student_map.setdefault(g_name, []).append(str(s.id))

    results = []
    for g in groups:
        sids = group_student_map.get(g.name, [])
        group_orders = [
            o for o in all_orders
            if o.student and o.student.get("matchedStudentId") in sids
        ]
        unpaid = sum(1 for o in group_orders if str(o.id) not in paid_order_ids)
        total = len(group_orders)

        if total == 0:
            health = "neutral"
        elif unpaid == 0:
            health = "green"
        elif unpaid / total < 0.5:
            health = "amber"
        else:
            health = "red"

        results.append({
            "name": g.name,
            "color": g.color,
            "student_count": len(sids),
            "orders_total": total,
            "orders_unpaid": unpaid,
            "health": health,
        })

    return results


async def get_dashboard_summary(program_class_id: str, term_id: str) -> Dict:
    collection = await get_collection_rate(program_class_id, term_id)
    completion = await get_form_completion_rate(program_class_id, term_id)
    groups = await get_group_health(program_class_id, term_id)

    return {
        "collection": collection,
        "completion": completion,
        "groups": groups,
    }
