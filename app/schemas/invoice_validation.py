import re
from typing import List, Optional
from decimal import Decimal


VALID_STATUSES = {"unpaid", "paid", "partially_paid"}
VALID_CURRENCIES = {"GHS", "USD", "EUR", "GBP"}


class InvoiceValidationError(Exception):
    pass


def validate_invoice_number(invoice_number: Optional[str]) -> None:
    if invoice_number is None:
        return
    if not re.match(r'^INV-[A-Z0-9]+-\d{4}$', invoice_number):
        raise InvoiceValidationError(
            "Invoice number must match INV-{term}-{4-digit-sequence}"
        )


def validate_invoice_status(status: str) -> None:
    if status not in VALID_STATUSES:
        raise InvoiceValidationError(
            f"Invalid invoice status: {status}. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
        )


def validate_invoice_currency(currency: Optional[str]) -> None:
    if currency is not None and currency.upper() not in VALID_CURRENCIES:
        raise InvoiceValidationError(
            f"Invalid currency: {currency}. Must be one of: {', '.join(sorted(VALID_CURRENCIES))}"
        )


def validate_line_items(line_items: list) -> None:
    if not line_items:
        raise InvoiceValidationError("At least one line item is required")
    for i, item in enumerate(line_items):
        qty = item.get("qty", 0) if isinstance(item, dict) else getattr(item, "qty", 0)
        unit_price = item.get("unitPrice", 0) if isinstance(item, dict) else getattr(item, "unitPrice", 0)
        if qty <= 0:
            raise InvoiceValidationError("Quantity must be greater than 0")
        if unit_price < 0:
            raise InvoiceValidationError("Unit price must be non-negative")


def validate_total_matches(total: float, line_items: list) -> None:
    expected = sum(
        (item.get("qty", 0) * item.get("unitPrice", 0)) if isinstance(item, dict)
        else (getattr(item, "qty", 0) * getattr(item, "unitPrice", 0))
        for item in line_items
    )
    if abs(total - expected) > 0.01:
        raise InvoiceValidationError(
            f"Total must equal sum of line items. Expected: {expected:.2f}, got: {total:.2f}"
        )


def validate_create_invoice(
    invoice_number: Optional[str],
    status: str,
    total_amount: float,
    line_items: list,
    currency: Optional[str] = None,
) -> None:
    validate_invoice_number(invoice_number)
    validate_invoice_status(status)
    validate_invoice_currency(currency)
    validate_line_items(line_items)
    validate_total_matches(total_amount, line_items)
