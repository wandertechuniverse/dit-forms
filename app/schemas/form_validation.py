"""
Form schema validation parity layer - mirrors frontend form-validator.js
Ensures identical validation rules on client and server
"""
from typing import Any


FIELD_TYPES = {"text", "number", "date", "select", "textarea", "file"}


def validate_form_schema(schema: dict) -> None:
    """
    Validate form schema. Raises ValueError with messages
    that match frontend form-validator.js exactly.
    """
    if not schema or not isinstance(schema, dict):
        raise ValueError("Schema must be an object")

    fields = schema.get("fields")
    if not isinstance(fields, list):
        raise ValueError("Schema must contain a fields array")

    if len(fields) == 0:
        raise ValueError("Form must have at least one field")

    if len(fields) > 50:
        raise ValueError("Forms cannot exceed 50 fields")

    # Check for duplicate keys
    keys = [f.get("key") for f in fields if f.get("key")]
    if len(keys) != len(set(keys)):
        raise ValueError("Field keys must be unique")

    # Validate each field
    for i, field in enumerate(fields):
        _validate_field(field, i + 1)


def _validate_field(field: dict, index: int) -> None:
    """Validate a single field definition."""
    if not field or not isinstance(field, dict):
        raise ValueError("Field must be an object")

    field_type = field.get("type")
    if field_type not in FIELD_TYPES:
        raise ValueError(f'Invalid field type "{field_type}"')

    # Validate key
    key = field.get("key", "")
    if not key:
        raise ValueError("Field key is required")
    if len(key) > 50:
        raise ValueError("Field key must be under 50 characters")
    if not key[0].isalpha() or not key[0].islower():
        raise ValueError("Key must start with lowercase letter")

    # Validate label
    label = field.get("label", "")
    if not label:
        raise ValueError("Label is required")
    if len(label) > 100:
        raise ValueError("Label must be under 100 characters")

    # Type-specific validation
    if field_type == "select":
        options = field.get("options", [])
        if not options or len(options) == 0:
            raise ValueError("Select fields must have at least one option")

    if field_type == "file":
        max_files = field.get("maxFiles", 1)
        if max_files < 1 or max_files > 10:
            raise ValueError("Max files must be between 1 and 10")
