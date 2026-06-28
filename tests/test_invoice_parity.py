"""
Invoice Validation Parity Test Suite
Ensures frontend (invoice-schema.ts) and backend (invoice_validation.py) produce identical error messages.
Run: PYTHONPATH=. pytest tests/test_invoice_parity.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import subprocess
import json
from pathlib import Path


INVOICE_TEST_CASES = [
    {
        "name": "invalid_invoice_number_format",
        "input": {"invoiceNumber": "INV-2026-ABC", "status": "unpaid", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 1, "unitPrice": 50}], "totalAmount": 50},
        "expected_error": "Invoice number must match INV-{term}-{4-digit-sequence}",
    },
    {
        "name": "invalid_status",
        "input": {"status": "pending", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 1, "unitPrice": 50}], "totalAmount": 50},
        "expected_error": "Invalid invoice status",
    },
    {
        "name": "invalid_currency",
        "input": {"status": "unpaid", "currency": "BTC", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 1, "unitPrice": 50}], "totalAmount": 50},
        "expected_error": "Invalid currency",
    },
    {
        "name": "empty_line_items",
        "input": {"status": "unpaid", "lineItems": [], "totalAmount": 0},
        "expected_error": "At least one line item is required",
    },
    {
        "name": "zero_quantity",
        "input": {"status": "unpaid", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 0, "unitPrice": 50}], "totalAmount": 0},
        "expected_error": "quantity must be greater than 0",
    },
    {
        "name": "negative_unit_price",
        "input": {"status": "unpaid", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 1, "unitPrice": -10}], "totalAmount": -10},
        "expected_error": "unit price must be non-negative",
    },
    {
        "name": "total_mismatch",
        "input": {"status": "unpaid", "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 2, "unitPrice": 50}], "totalAmount": 200},
        "expected_error": "Total must equal sum of line items",
    },
    {
        "name": "valid_invoice",
        "input": {
            "invoiceNumber": "INV-TERM-0001",
            "status": "unpaid",
            "currency": "GHS",
            "lineItems": [{"courseId": "c1", "handoutItemId": "h1", "qty": 2, "unitPrice": 75.50}],
            "totalAmount": 151.00,
        },
        "expected_error": "",
    },
]


class TestInvoiceParity:
    """Validates frontend <-> backend parity for invoice validation."""

    @pytest.mark.parametrize("case", INVOICE_TEST_CASES, ids=lambda c: c["name"])
    def test_invoice_error_parity(self, case):
        backend_error = self._get_backend_error(case["input"])
        zod_error = self._get_zod_error(case["input"])

        if case["expected_error"] == "":
            assert backend_error is None, f"Backend rejected valid invoice: {backend_error}"
            assert zod_error is None, f"Zod rejected valid invoice: {zod_error}"
            return

        assert backend_error is not None, "Backend should have rejected this input"
        assert zod_error is not None, "Zod should have rejected this input"
        assert case["expected_error"].lower() in backend_error.lower(), f"Backend missing: {backend_error}"
        assert case["expected_error"].lower() in zod_error.lower(), f"Zod missing: {zod_error}"

        norm_b = self._normalize(backend_error)
        norm_z = self._normalize(zod_error)
        assert norm_b == norm_z, f"Mismatch!\nBackend: {backend_error}\nZod:     {zod_error}"

    def _get_backend_error(self, input_data: dict) -> str | None:
        from app.schemas.invoice_validation import (
            validate_create_invoice,
            InvoiceValidationError,
        )
        try:
            validate_create_invoice(
                invoice_number=input_data.get("invoiceNumber"),
                status=input_data["status"],
                total_amount=input_data["totalAmount"],
                line_items=input_data["lineItems"],
                currency=input_data.get("currency"),
            )
            return None
        except InvoiceValidationError as e:
            return str(e)

    def _get_zod_error(self, input_data: dict) -> str | None:
        payload = {
            "status": input_data["status"],
            "lineItems": input_data["lineItems"],
            "totalAmount": input_data["totalAmount"],
        }
        if "invoiceNumber" in input_data:
            payload["invoiceNumber"] = input_data["invoiceNumber"]
        if "currency" in input_data:
            payload["currency"] = input_data["currency"]

        script = f"""
import {{ invoiceSchema }} from './frontend-react/src/lib/invoice-schema.ts';
const result = invoiceSchema.safeParse({json.dumps(payload)});
if (result.success) {{
  console.log('');
}} else {{
  console.log(result.error.issues[0].message);
}}
"""
        try:
            result = subprocess.run(
                ["bun", "-e", script],
                cwd=Path(__file__).parent.parent,
                capture_output=True, text=True, timeout=10,
            )
            if result.returncode != 0:
                return None
            return result.stdout.strip() or None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None

    def _normalize(self, msg: str) -> str:
        import re
        msg = re.sub(r'Must be one of:.*', 'Must be one of: [sorted]', msg)
        msg = re.sub(r'[^\w\s]', '', msg.lower())
        return re.sub(r'\s+', ' ', msg).strip()
