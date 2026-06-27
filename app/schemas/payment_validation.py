"""
Payment validation parity layer - mirrors frontend payment form validation
Ensures identical validation rules on client and server
"""
from typing import Optional
from datetime import datetime


VALID_METHODS = {"cash", "bank", "mobile", "other"}
VALID_CURRENCIES = {"GHS", "USD", "EUR", "GBP"}
MAX_REFERENCE_LENGTH = 100
MIN_AMOUNT = 0.01
MAX_AMOUNT = 1_000_000


class PaymentValidationError(Exception):
    pass


def validate_payment_amount(amount: float) -> None:
    """Validate payment amount."""
    if not isinstance(amount, (int, float)):
        raise PaymentValidationError("Amount must be a number")
    if amount <= MIN_AMOUNT:
        raise PaymentValidationError(f"Amount must be greater than {MIN_AMOUNT}")
    if amount > MAX_AMOUNT:
        raise PaymentValidationError(f"Amount cannot exceed {MAX_AMOUNT:,.0f}")


def validate_payment_method(method: str) -> None:
    """Validate payment method."""
    if method not in VALID_METHODS:
        raise PaymentValidationError(
            f"Invalid payment method: {method}. Must be one of: {', '.join(sorted(VALID_METHODS))}"
        )


def validate_payment_currency(currency: Optional[str]) -> None:
    """Validate payment currency if provided."""
    if currency is not None and currency.upper() not in VALID_CURRENCIES:
        raise PaymentValidationError(
            f"Invalid currency: {currency}. Must be one of: {', '.join(sorted(VALID_CURRENCIES))}"
        )


def validate_payment_reference(reference: Optional[str]) -> None:
    """Validate payment reference if provided."""
    if reference is not None:
        if not isinstance(reference, str):
            raise PaymentValidationError("Reference must be a string")
        if len(reference) > MAX_REFERENCE_LENGTH:
            raise PaymentValidationError(
                f"Reference must be under {MAX_REFERENCE_LENGTH} characters"
            )


def validate_payment_date(paid_at: Optional[datetime]) -> None:
    """Validate payment date if provided."""
    if paid_at is not None:
        if isinstance(paid_at, datetime) and paid_at > datetime.utcnow():
            raise PaymentValidationError("Payment date cannot be in the future")


def validate_overpayment(
    amount: float,
    total_paid: float,
    total_owed: float,
) -> None:
    """Validate that payment doesn't exceed remaining balance."""
    if total_paid + amount > total_owed:
        remaining = total_owed - total_paid
        raise PaymentValidationError(
            f"Payment would exceed remaining balance. "
            f"Remaining: {remaining:.2f}, attempted: {amount:.2f}"
        )


def validate_create_payment(
    amount: float,
    method: str,
    currency: Optional[str] = None,
    reference: Optional[str] = None,
    paid_at: Optional[datetime] = None,
    total_paid: float = 0,
    total_owed: float = 0,
) -> None:
    """
    Validate all payment creation fields.
    Matches frontend validation in payments.html.
    """
    validate_payment_amount(amount)
    validate_payment_method(method)
    validate_payment_currency(currency)
    validate_payment_reference(reference)
    validate_payment_date(paid_at)
    validate_overpayment(amount, total_paid, total_owed)
