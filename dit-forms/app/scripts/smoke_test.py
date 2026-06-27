"""
Post-Deployment Smoke Test Script
Validates critical user flows against the live production environment.
Run with: python app/scripts/smoke_test.py
"""
import os
import sys
import time
import requests
from datetime import datetime

# Configuration - Load from environment or defaults
BASE_URL = os.getenv("SMOKE_TEST_BASE_URL", "http://localhost")
ADMIN_EMAIL = os.getenv("SMOKE_ADMIN_EMAIL", "admin@dit.edu")
ADMIN_PASSWORD = os.getenv("SMOKE_ADMIN_PASSWORD", "admin123")
TEST_SCOPE_PROGRAM = os.getenv("SMOKE_PROGRAM_CLASS", "DIT-2026-A")
TEST_SCOPE_TERM = os.getenv("SMOKE_TERM_ID", "2026-S1")

# Global state for cleanup
created_resources = {
    "form_id": None,
    "submission_id": None,
    "order_id": None,
    "test_id_number": None,
}
headers = {}


def log(status, message):
    icon = {"PASS": "✅", "FAIL": "❌", "INFO": "ℹ️", "WARN": "⚠️"}
    print(f"{icon.get(status, '•')} [{status}] {datetime.now().strftime('%H:%M:%S')} | {message}")


def assert_response(response, expected_status=200, context=""):
    try:
        response.raise_for_status()
        if expected_status != 204:
            return response.json()
        log("PASS", f"{context}: Status {response.status_code}")
        return {}
    except requests.exceptions.HTTPError as e:
        log("FAIL", f"{context}: Expected {expected_status}, got {response.status_code}. Body: {e.response.text[:200]}")
        raise


# ==========================================
# TEST SUITE
# ==========================================

def test_01_health_check():
    log("INFO", "Testing /health endpoint...")
    resp = requests.get(f"{BASE_URL}/health", timeout=10)
    data = assert_response(resp, context="Health Check")
    assert data.get("status") == "ok", "Health status is not 'ok'"
    log("PASS", "Backend health check passed")


def test_02_admin_login():
    global headers
    log("INFO", "Testing admin login...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    data = assert_response(resp, context="Admin Login")
    assert "access_token" in data, "No access_token in login response"
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    log("PASS", "Admin login successful")


def test_03_create_handout_form():
    log("INFO", "Creating test HandOuts Tracker form...")
    resp = requests.post(
        f"{BASE_URL}/forms",
        headers=headers,
        json={
            "name": f"[SMOKE TEST] Form {int(time.time())}",
            "programClassId": TEST_SCOPE_PROGRAM,
            "termId": TEST_SCOPE_TERM,
            "formType": "handout_tracker",
            "purpose": "Smoke test validation"
        },
        timeout=10
    )
    data = assert_response(resp, 201, context="Create Form")
    created_resources["form_id"] = data["id"]
    log("PASS", f"Form created: {data['id']}")


def test_04_publish_form_version():
    log("INFO", "Publishing form version with handout_array schema...")
    schema = {
        "fields": [
            {"key": "givenOutAt", "label": "Date Given Out", "type": "date", "required": True},
            {"key": "handouts", "label": "Handout Items", "type": "handout_array", "required": True}
        ]
    }
    resp = requests.post(
        f"{BASE_URL}/forms/{created_resources['form_id']}/versions",
        headers=headers,
        json={"schema": schema, "status": "published"},
        timeout=10
    )
    data = assert_response(resp, 201, context="Publish Version")
    assert data["status"] == "published", "Version was not published"
    log("PASS", "Form version published successfully")


def test_05_public_submission():
    log("INFO", "Submitting public form as test student...")
    test_id = f"SMOKE{int(time.time())}"
    created_resources["test_id_number"] = test_id
    submission_payload = {
        "fullName": "Smoke Test Student",
        "idNumber": test_id,
        "answers": {
            "givenOutAt": datetime.utcnow().strftime("%Y-%m-%d"),
            "handouts": [
                {"courseId": "ENT101", "handoutItemId": "HND-SMOKE-001", "qty": 1, "unitPrice": 50.0}
            ]
        }
    }
    resp = requests.post(
        f"{BASE_URL}/public/forms/{created_resources['form_id']}/submit",
        json=submission_payload,
        timeout=10
    )
    data = assert_response(resp, 201, context="Public Submission")
    created_resources["submission_id"] = data["submissionId"]
    log("PASS", f"Submission created: {data['submissionId']}")


def test_06_verify_auto_invoice():
    log("INFO", "Verifying auto-generated invoice...")
    resp = requests.get(
        f"{BASE_URL}/handout-orders?programClassId={TEST_SCOPE_PROGRAM}&termId={TEST_SCOPE_TERM}",
        headers=headers,
        timeout=10
    )
    data = assert_response(resp, context="List Handout Orders")

    orders = [o for o in data.get("orders", [])
              if o.get("formSubmissionId") == created_resources["submission_id"]]

    assert len(orders) > 0, "No invoice found for submission"
    order = orders[0]
    created_resources["order_id"] = order["id"]

    assert order["invoice"]["totalAmount"] == 50.0, \
        f"Expected total 50.0, got {order['invoice']['totalAmount']}"
    assert order["invoice"]["invoiceStatus"] == "unpaid", \
        f"Expected unpaid, got {order['invoice']['invoiceStatus']}"
    log("PASS", f"Invoice verified: GH₵ {order['invoice']['totalAmount']} (unpaid)")


def test_07_record_payment():
    log("INFO", "Recording payment...")
    resp = requests.post(
        f"{BASE_URL}/payments",
        headers=headers,
        json={
            "handoutOrderId": created_resources["order_id"],
            "amount": 50.0,
            "method": "cash",
            "reference": "SMOKE-PAY-001"
        },
        timeout=10
    )
    assert_response(resp, 201, context="Record Payment")

    resp = requests.get(
        f"{BASE_URL}/handout-orders/{created_resources['order_id']}",
        headers=headers,
        timeout=10
    )
    data = assert_response(resp, context="Verify Paid Status")
    assert data["invoice"]["invoiceStatus"] == "paid", \
        f"Expected paid, got {data['invoice']['invoiceStatus']}"
    log("PASS", "Payment recorded and invoice marked as paid")


def test_08_duplicate_enforcement():
    log("INFO", "Testing duplicate handout enforcement...")
    submission_payload = {
        "fullName": "Smoke Test Student",
        "idNumber": created_resources["test_id_number"],
        "answers": {
            "givenOutAt": datetime.utcnow().strftime("%Y-%m-%d"),
            "handouts": [
                {"courseId": "ENT101", "handoutItemId": "HND-SMOKE-002", "qty": 1, "unitPrice": 50.0}
            ]
        }
    }
    resp = requests.post(
        f"{BASE_URL}/public/forms/{created_resources['form_id']}/submit",
        json=submission_payload,
        timeout=10
    )
    assert resp.status_code == 400, \
        f"Expected 400 for duplicate, got {resp.status_code}"
    body = resp.json()
    detail = body.get("detail", "").lower()
    assert "duplicate" in detail or "already submitted" in detail, \
        f"Duplicate error message missing: {body}"
    log("PASS", "Duplicate enforcement working correctly")


def test_09_csv_export():
    log("INFO", "Testing CSV export...")
    resp = requests.get(
        f"{BASE_URL}/export/students?programClassId={TEST_SCOPE_PROGRAM}&termId={TEST_SCOPE_TERM}",
        headers=headers,
        timeout=10
    )
    assert resp.status_code == 200, f"Export failed: {resp.status_code}"
    assert "text/csv" in resp.headers.get("Content-Type", ""), "Response is not CSV"
    content = resp.text.strip()
    assert len(content.split("\n")) >= 1, "CSV appears empty"
    log("PASS", "CSV export returning valid data")


def cleanup():
    log("INFO", "Cleaning up test resources...")
    try:
        if created_resources["form_id"]:
            requests.delete(
                f"{BASE_URL}/forms/{created_resources['form_id']}",
                headers=headers,
                timeout=10
            )
            log("PASS", "Test form deleted")
    except Exception as e:
        log("WARN", f"Cleanup incomplete: {e}")


# ==========================================
# MAIN EXECUTION
# ==========================================

if __name__ == "__main__":
    tests = [
        test_01_health_check,
        test_02_admin_login,
        test_03_create_handout_form,
        test_04_publish_form_version,
        test_05_public_submission,
        test_06_verify_auto_invoice,
        test_07_record_payment,
        test_08_duplicate_enforcement,
        test_09_csv_export,
    ]

    passed = 0
    failed = 0

    log("INFO", "=" * 60)
    log("INFO", "DIT TRACKER POST-DEPLOYMENT SMOKE TEST")
    log("INFO", f"Target: {BASE_URL}")
    log("INFO", "=" * 60)

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            failed += 1
            log("FAIL", f"{test_fn.__name__}: {str(e)[:100]}")

    cleanup()

    log("INFO", "=" * 60)
    log("INFO", f"RESULTS: {passed} PASSED, {failed} FAILED out of {len(tests)} tests")
    log("INFO", "=" * 60)

    sys.exit(1 if failed > 0 else 0)
