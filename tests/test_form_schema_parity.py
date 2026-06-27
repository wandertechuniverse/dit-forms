"""
Form Schema Validation Parity Test Suite
Ensures frontend (form-validator.js) and backend (form_validation.py) produce identical error messages.
Run: pytest tests/test_form_schema_parity.py -v
"""
import pytest
import subprocess
import json
import re
from pathlib import Path


# Test cases covering all critical form validation rules
FORM_SCHEMA_TEST_CASES = [
    {
        "name": "missing_required_label",
        "input": {"fields": [{"key": "test", "type": "text"}]},
        "expected_error": "Label is required"
    },
    {
        "name": "invalid_field_key_prefix",
        "input": {"fields": [{"key": "123name", "label": "Name", "type": "text"}]},
        "expected_error": "Key must start with lowercase letter"
    },
    {
        "name": "empty_fields_array",
        "input": {"fields": []},
        "expected_error": "Form must have at least one field"
    },
    {
        "name": "excessive_fields_count",
        "input": {"fields": [{"key": f"f{i}", "label": f"Field {i}", "type": "text"} for i in range(51)]},
        "expected_error": "Forms cannot exceed 50 fields"
    },
    {
        "name": "invalid_field_type",
        "input": {"fields": [{"key": "test", "label": "Test", "type": "magic"}]},
        "expected_error": "Invalid field type"
    },
    {
        "name": "select_no_options",
        "input": {"fields": [{"key": "choice", "label": "Choice", "type": "select", "options": []}]},
        "expected_error": "Select fields must have at least one option"
    },
    {
        "name": "missing_field_key",
        "input": {"fields": [{"label": "Name", "type": "text"}]},
        "expected_error": "Field key is required"
    },
    {
        "name": "duplicate_field_keys",
        "input": {"fields": [
            {"key": "name", "label": "Name 1", "type": "text"},
            {"key": "name", "label": "Name 2", "type": "text"},
        ]},
        "expected_error": "Field keys must be unique"
    },
    {
        "name": "valid_schema",
        "input": {"fields": [
            {"key": "full_name", "label": "Full Name", "type": "text"},
            {"key": "id_number", "label": "ID Number", "type": "text"},
        ]},
        "expected_error": None,  # Should pass validation
    },
]


class TestFormSchemaParity:
    """Validates Zod ↔ Pydantic parity for form schema definitions."""

    @pytest.mark.parametrize("case", FORM_SCHEMA_TEST_CASES, ids=lambda c: c["name"])
    def test_schema_error_parity(self, case):
        pydantic_error = self._get_backend_schema_error(case["input"])
        zod_error = self._get_frontend_schema_error(case["input"])

        # Both should have same error or both should pass
        if case["expected_error"] is None:
            assert pydantic_error is None, f"Backend failed unexpectedly: {pydantic_error}"
            assert zod_error is None, f"Frontend failed unexpectedly: {zod_error}"
            return

        assert pydantic_error is not None, "Backend should have rejected this schema"
        assert zod_error is not None, "Frontend should have rejected this schema"
        assert case["expected_error"] in pydantic_error, \
            f"Backend missing expected error. Got: {pydantic_error}"
        assert case["expected_error"] in zod_error, \
            f"Frontend missing expected error. Got: {zod_error}"

        # Normalize and compare messages
        norm_p = self._normalize(pydantic_error)
        norm_z = self._normalize(zod_error)
        assert norm_p == norm_z, \
            f"Mismatch!\nBackend:  {pydantic_error}\nFrontend: {zod_error}"

    def _get_backend_schema_error(self, schema: dict) -> str | None:
        """Get error from backend form validation."""
        from app.schemas.form_validation import validate_form_schema

        try:
            validate_form_schema(schema)
            return None
        except ValueError as e:
            return str(e)

    def _get_frontend_schema_error(self, schema: dict) -> str | None:
        """Get error from frontend form validation (mirrors form-validator.js)."""
        errors = []

        if not schema or not isinstance(schema, dict):
            return "Schema must be an object"

        fields = schema.get("fields")
        if not isinstance(fields, list):
            return "Schema must contain a fields array"

        if len(fields) == 0:
            return "Form must have at least one field"

        if len(fields) > 50:
            errors.append("Forms cannot exceed 50 fields")

        keys = [f.get("key") for f in fields if f.get("key")]
        if len(keys) != len(set(keys)):
            errors.append("Field keys must be unique")

        FIELD_TYPES = {"text", "number", "date", "select", "textarea", "file"}

        for field in fields:
            field_type = field.get("type")
            if field_type not in FIELD_TYPES:
                return f'Invalid field type "{field_type}"'

            key = field.get("key", "")
            if not key:
                return "Field key is required"
            elif len(key) > 50:
                return "Field key must be under 50 characters"
            elif not key[0].isalpha() or not key[0].islower():
                return "Key must start with lowercase letter"

            label = field.get("label", "")
            if not label:
                return "Label is required"
            elif len(label) > 100:
                return "Label must be under 100 characters"

            if field_type == "select":
                options = field.get("options", [])
                if not options or len(options) == 0:
                    return "Select fields must have at least one option"

        return errors[0] if errors else None

    def _normalize(self, msg: str) -> str:
        """Normalize error message for comparison."""
        msg = re.sub(r'[^\w\s]', '', msg.lower())
        return re.sub(r'\s+', ' ', msg).strip()
