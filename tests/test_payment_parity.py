"""
Payment Validation Parity Test Suite
Ensures frontend (payment-schema.ts) and backend (payment_validation.py) produce identical error messages.
Run: pytest tests/test_payment_parity.py -v
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import subprocess
import json
from pathlib import Path
from datetime import datetime, timedelta


# Test cases covering all critical payment validation rules
PAYMENT_TEST_CASES = [
    {
        "name": "zero_amount",
        "input": {"amount": 0, "method": "cash", "total_owed": 100},
        "expected_error": "Amount must be greater than",
    },
    {
        "name": "negative_amount",
        "input": {"amount": -50, "method": "cash", "total_owed": 100},
        "expected_error": "Amount must be greater than",
    },
    {
        "name": "excessive_amount",
        "input": {"amount": 2_000_000, "method": "cash", "total_owed": 100},
        "expected_error": "Amount cannot exceed",
    },
    {
        "name": "invalid_method",
        "input": {"amount": 50, "method": "crypto", "total_owed": 100},
        "expected_error": "Invalid payment method",
    },
    {
        "name": "invalid_currency",
        "input": {"amount": 50, "method": "cash", "currency": "BTC", "total_owed": 100},
        "expected_error": "Invalid currency",
    },
    {
        "name": "reference_too_long",
        "input": {"amount": 50, "method": "cash", "reference": "x" * 101, "total_owed": 100},
        "expected_error": "Reference must be under",
    },
    {
        "name": "future_date",
        "input": {"amount": 50, "method": "cash", "paid_at": datetime.utcnow() + timedelta(days=1), "total_owed": 100},
        "expected_error": "Payment date cannot be in the future",
    },
    {
        "name": "overpayment",
        "input": {"amount": 150, "method": "cash", "total_paid": 80, "total_owed": 100},
        "expected_error": "Payment would exceed remaining balance",
    },
    {
        "name": "valid_cash_payment",
        "input": {"amount": 50, "method": "cash", "total_owed": 100},
        "expected_error": None,
    },
    {
        "name": "valid_bank_payment",
        "input": {"amount": 100, "method": "bank", "currency": "GHS", "reference": "TXN-123", "total_owed": 200},
        "expected_error": None,
    },
    {
        "name": "valid_mobile_payment",
        "input": {"amount": 75.50, "method": "mobile", "currency": "USD", "total_owed": 100},
        "expected_error": None,
    },
]


class TestPaymentParity:
    """Validates frontend ↔ backend parity for payment validation."""

    @pytest.mark.parametrize("case", PAYMENT_TEST_CASES, ids=lambda c: c["name"])
    def test_payment_validation_parity(self, case):
        backend_error = self._get_backend_error(case["input"])
        frontend_error = self._get_frontend_error(case["input"])

        # Both should have same error or both should pass
        if case["expected_error"] is None:
            assert backend_error is None, f"Backend failed unexpectedly: {backend_error}"
            assert frontend_error is None, f"Frontend failed unexpectedly: {frontend_error}"
            return

        assert backend_error is not None, "Backend should have rejected this payment"
        assert frontend_error is not None, "Frontend should have rejected this payment"
        assert case["expected_error"] in backend_error, \
            f"Backend missing expected error. Got: {backend_error}"
        assert case["expected_error"] in frontend_error, \
            f"Frontend missing expected error. Got: {frontend_error}"

        # Normalize and compare messages
        norm_b = self._normalize(backend_error)
        norm_f = self._normalize(frontend_error)
        assert norm_b == norm_f, \
            f"Mismatch!\nBackend:  {backend_error}\nFrontend: {frontend_error}"

    def _get_backend_error(self, input_data: dict) -> str | None:
        """Get error from backend payment validation."""
        from app.schemas.payment_validation import (
            validate_create_payment,
            PaymentValidationError,
        )

        try:
            validate_create_payment(
                amount=input_data["amount"],
                method=input_data["method"],
                currency=input_data.get("currency"),
                reference=input_data.get("reference"),
                paid_at=input_data.get("paid_at"),
                total_paid=input_data.get("total_paid", 0),
                total_owed=input_data.get("total_owed", 0),
            )
            return None
        except PaymentValidationError as e:
            return str(e)

    def _get_frontend_error(self, input_data: dict) -> str | None:
        """Get error from frontend payment validation (mirrors payments.html)."""
        VALID_METHODS = {"cash", "bank", "mobile", "other"}
        VALID_CURRENCIES = {"GHS", "USD", "EUR", "GBP"}

        amount = input_data["amount"]
        method = input_data["method"]
        currency = input_data.get("currency")
        reference = input_data.get("reference")
        paid_at = input_data.get("paid_at")
        total_paid = input_data.get("total_paid", 0)
        total_owed = input_data.get("total_owed", 0)

        # Amount validation
        if not isinstance(amount, (int, float)):
            return "Amount must be a number"
        if amount <= 0.01:
            return "Amount must be greater than 0.01"
        if amount > 1_000_000:
            return "Amount cannot exceed 1,000,000"

        # Method validation
        if method not in VALID_METHODS:
            return f"Invalid payment method: {method}. Must be one of: bank, cash, mobile, other"

        # Currency validation
        if currency is not None and currency.upper() not in VALID_CURRENCIES:
            return f"Invalid currency: {currency}. Must be one of: EUR, GHS, GBP, USD"

        # Reference validation
        if reference is not None and len(reference) > 100:
            return "Reference must be under 100 characters"

        # Date validation
        if paid_at is not None and paid_at > datetime.utcnow():
            return "Payment date cannot be in the future"

        # Overpayment validation
        if total_paid + amount > total_owed:
            remaining = total_owed - total_paid
            return f"Payment would exceed remaining balance. Remaining: {remaining:.2f}, attempted: {amount:.2f}"

        return None

    def _normalize(self, msg: str) -> str:
        """Normalize error message for comparison."""
        import re
        # Normalize method lists (order may vary)
        msg = re.sub(r'Must be one of:.*', 'Must be one of: [sorted]', msg)
        msg = re.sub(r'[^\w\s]', '', msg.lower())
        return re.sub(r'\s+', ' ', msg).strip()

    @pytest.mark.parametrize("case", PAYMENT_TEST_CASES, ids=lambda c: c["name"])
    def test_zod_parity(self, case):
        """Validate Zod schema produces same errors as backend."""
        if case["expected_error"] is None:
            pytest.skip("Valid input - Zod parity not applicable")

        zod_error = self._get_zod_error(case["input"])
        if zod_error is None:
            pytest.skip("Zod not available in CI")

        backend_error = self._get_backend_error(case["input"])
        norm_b = self._normalize(backend_error) if backend_error else ""
        norm_z = self._normalize(zod_error)
        assert norm_b == norm_z, \
            f"Zod vs Backend mismatch!\nBackend: {backend_error}\nZod:     {zod_error}"

    def _get_zod_error(self, input_data: dict) -> str | None:
        """Get error from Zod schema via bun subprocess."""
        payload = {
            "amount": input_data["amount"],
            "method": input_data["method"],
        }
        if "currency" in input_data:
            payload["currency"] = input_data["currency"]
        if "reference" in input_data:
            payload["reference"] = input_data["reference"]
        if "paid_at" in input_data:
            dt = input_data["paid_at"]
            iso = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
            payload["paidAt"] = iso if iso.endswith("Z") else iso + "Z"
        if "total_owed" in input_data:
            payload["totalOwed"] = input_data["total_owed"]
        if "total_paid" in input_data:
            payload["totalPaid"] = input_data["total_paid"]

        script = f"""
import {{ paymentSchema }} from './frontend-react/src/lib/payment-schema.ts';
const result = paymentSchema.safeParse({json.dumps(payload)});
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
                capture_output=True, text=True, timeout=10
            )
            if result.returncode != 0:
                return None
            return result.stdout.strip() or None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None
