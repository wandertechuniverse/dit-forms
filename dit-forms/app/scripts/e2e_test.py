#!/usr/bin/env python3
"""
E2E Test: Handout Tracker → Auto-Invoice → Payment Flow
Tests the complete business logic chain.
"""
import requests
import sys
import json

BASE = "http://localhost:8000"
ADMIN_EMAIL = "admin@dit.edu"
ADMIN_PASS = "admin123"

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
results = []


def check(name, condition, detail=""):
    if condition:
        print(f"  {PASS} {name}")
        results.append(True)
    else:
        print(f"  {FAIL} {name}{': ' + detail if detail else ''}")
        results.append(False)


def main():
    print("\n🧪 E2E Test: Handout Flow\n")

    # Clean leftover test data
    try:
        import os
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        mongo_uri = os.environ.get("MONGO_URI", "")
        if not mongo_uri:
            from dotenv import load_dotenv
            load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
            mongo_uri = os.environ.get("MONGO_URI", "")
        mongo_db = os.environ.get("MONGO_DB", "dit_forms")
        if mongo_uri:
            client = AsyncIOMotorClient(mongo_uri)
            db = client[mongo_db]
            asyncio.get_event_loop().run_until_complete(
                db.form_definitions.delete_many({})
            )
            asyncio.get_event_loop().run_until_complete(
                db.form_versions.delete_many({})
            )
            asyncio.get_event_loop().run_until_complete(
                db.form_submissions.delete_many({})
            )
            asyncio.get_event_loop().run_until_complete(
                db.handout_orders.delete_many({})
            )
            client.close()
            print("  Database cleaned for fresh test run\n")
    except Exception as e:
        print(f"  Warning: Could not clean database: {e}\n")

    # 1. Login
    r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    if r.status_code != 200:
        print(f"  {FAIL} Admin login failed: {r.status_code} {r.text}")
        sys.exit(1)
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    check("Admin login", True)

    program_class_id = "DIT-2026-A"
    term_id = "2026-S1"

    # 2. Create form
    r = requests.post(f"{BASE}/forms", headers=h, json={
        "name": "Sem 1 Handouts",
        "purpose": "Track handout distribution",
        "programClassId": program_class_id,
        "termId": term_id,
        "formType": "handout_tracker",
        "initialSchema": {
            "fields": [
                {"id": "f1", "key": "course", "label": "Course Code", "type": "text", "required": True},
                {"id": "f2", "key": "handout_items", "label": "Handout Items", "type": "handout_array", "required": True},
                {"id": "f3", "key": "givenOutAt", "label": "Date Given Out", "type": "date", "required": True},
            ]
        }
    })
    check("Create form", r.status_code in [200, 201], f"{r.status_code}: {r.text[:200]}")
    form_id = r.json().get("id")
    if not form_id:
        print(f"\n  Cannot continue without form_id")
        sys.exit(1)

    # 3. Get versions
    r = requests.get(f"{BASE}/forms/{form_id}", headers=h)
    check("Get form versions", r.status_code == 200)
    versions = r.json().get("versions", [])
    draft_id = versions[0]["id"] if versions else None
    check("Has draft version", draft_id is not None)

    # 4. Publish form
    r = requests.post(f"{BASE}/forms/{form_id}/versions/{draft_id}/publish", headers=h)
    check("Publish form", r.status_code in [200, 201], f"{r.status_code}: {r.text[:200]}")

    # 5. Verify published
    r = requests.get(f"{BASE}/forms/{form_id}", headers=h)
    status = r.json().get("status")
    check("Form status is published", status == "published", f"Got: {status}")

    # 6. Public submission
    r = requests.post(f"{BASE}/public/forms/{form_id}/submit", json={
        "fullName": "Ama Doe",
        "idNumber": "01240001C",
        "answers": {
            "f1": "ENT101",
            "f2": [
                {"courseId": "ENT101", "handoutItemId": "HND-001", "qty": 1, "unitPrice": 50}
            ],
            "f3": "2026-01-15",
        },
    })
    check("Submit public form", r.status_code in [200, 201], f"{r.status_code}: {r.text[:200]}")

    # 7. Check handout order
    r = requests.get(f"{BASE}/handout-orders?programClassId={program_class_id}&termId={term_id}", headers=h)
    orders = r.json().get("orders", [])
    check("Handout order created", len(orders) > 0, f"Found {len(orders)} orders")

    if orders:
        order = orders[0]
        total = order.get("invoice", {}).get("totalAmount")
        inv_status = order.get("invoice", {}).get("invoiceStatus")
        student = order.get("student", {}).get("fullNameSnapshot", "Unknown")
        check(f"Order total is GH₵ 50 (student: {student})", total == 50.0, f"Got: {total}")
        check("Order status is unpaid", inv_status == "unpaid", f"Got: {inv_status}")

        order_id = order.get("id")

        # 8. Mark paid
        r = requests.post(f"{BASE}/handout-orders/{order_id}/mark-paid", headers=h, json={
            "amount": 50, "paymentMethod": "cash", "transactionId": "CASH-001"
        })
        check("Mark order as paid", r.status_code in [200, 201], f"{r.status_code}: {r.text[:200]}")

        # 9. Verify paid
        r = requests.get(f"{BASE}/handout-orders?programClassId={program_class_id}&termId={term_id}", headers=h)
        updated = r.json().get("orders", [{}])[0]
        new_status = updated.get("invoice", {}).get("invoiceStatus")
        check("Order status is now paid", new_status == "paid", f"Got: {new_status}")

    # 10. Duplicate submission
    r = requests.post(f"{BASE}/public/forms/{form_id}/submit", json={
        "fullName": "Ama Doe",
        "idNumber": "01240001C",
        "answers": {
            "f1": "ENT101",
            "f2": [
                {"courseId": "ENT101", "handoutItemId": "HND-001", "qty": 1, "unitPrice": 50}
            ],
            "f3": "2026-01-15",
        },
    })
    check("Duplicate submission rejected", r.status_code in [400, 409, 422],
          f"Expected 400/409/422, got {r.status_code}")

    # 11. Export
    r = requests.get(f"{BASE}/export/students?programClassId={program_class_id}&termId={term_id}", headers=h)
    check("Export students CSV", r.status_code == 200)

    # Results
    passed = sum(results)
    total = len(results)
    print(f"\n{'='*40}")
    print(f"  Results: {passed}/{total} passed")
    if passed == total:
        print(f"  All tests passed!")
    else:
        print(f"  {total - passed} test(s) failed")
    print()
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
