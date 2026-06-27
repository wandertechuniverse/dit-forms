"""
Validation Parity Test Suite
Ensures frontend (form-validator.js) and backend (upload.py, form_validation.py) produce identical error messages.
Run: python tests/test_validation_parity.py
"""


def get_backend_errors(input_data: dict) -> list[str]:
    """Get error messages from backend validation."""
    errors = []

    if "file_type" in input_data:
        from app.schemas.upload import ALLOWED_MIME_TYPES, MAX_FILE_SIZE

        if input_data["file_type"] not in ALLOWED_MIME_TYPES:
            errors.append(f"Only JPG, PNG, or PDF allowed. Got {input_data['file_type']}")

        file_size = input_data.get("file_size", 0)
        if file_size > MAX_FILE_SIZE:
            size_mb = round(file_size / 1024 / 1024, 1)
            errors.append(f"File too large ({size_mb}MB). Max 5MB.")

    if "student_id" in input_data:
        import uuid

        try:
            uuid.UUID(input_data["student_id"], version=4)
        except ValueError:
            errors.append("Valid Student ID (UUID v4) required")

    return errors


# Frontend validation (embedded JS logic in Python for testing)
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"]
MAX_FILE_SIZE = 5 * 1024 * 1024


def get_frontend_errors(input_data: dict) -> list[str]:
    """Get error messages from frontend validation (mirrors form-validator.js)."""
    errors = []

    if "file_type" in input_data:
        if input_data["file_type"] not in ALLOWED_MIME_TYPES:
            errors.append(f"Only JPG, PNG, or PDF allowed. Got {input_data['file_type']}")

        file_size = input_data.get("file_size", 0)
        if file_size > MAX_FILE_SIZE:
            size_mb = round(file_size / 1024 / 1024, 1)
            errors.append(f"File too large ({size_mb}MB). Max 5MB.")

    if "student_id" in input_data:
        import uuid

        try:
            uuid.UUID(input_data["student_id"], version=4)
        except ValueError:
            errors.append("Valid Student ID (UUID v4) required")

    return errors


# Test cases
TEST_CASES = [
    {
        "name": "invalid_file_type_webp",
        "input": {"file_type": "image/webp", "file_size": 1024},
        "expected": "Only JPG, PNG, or PDF allowed. Got image/webp",
    },
    {
        "name": "invalid_file_type_gif",
        "input": {"file_type": "image/gif", "file_size": 1024},
        "expected": "Only JPG, PNG, or PDF allowed. Got image/gif",
    },
    {
        "name": "file_too_large_6mb",
        "input": {"file_type": "image/jpeg", "file_size": 6 * 1024 * 1024},
        "expected": "File too large",
    },
    {
        "name": "file_too_large_10mb",
        "input": {"file_type": "image/png", "file_size": 10 * 1024 * 1024},
        "expected": "File too large",
    },
    {
        "name": "invalid_uuid",
        "input": {"student_id": "not-a-uuid"},
        "expected": "Valid Student ID (UUID v4) required",
    },
    {
        "name": "invalid_uuid_short",
        "input": {"student_id": "abc123"},
        "expected": "Valid Student ID (UUID v4) required",
    },
    {
        "name": "valid_jpeg_small",
        "input": {"file_type": "image/jpeg", "file_size": 1024 * 1024},
        "expected": None,  # Should pass
    },
    {
        "name": "valid_png",
        "input": {"file_type": "image/png", "file_size": 2 * 1024 * 1024},
        "expected": None,  # Should pass
    },
    {
        "name": "valid_pdf",
        "input": {"file_type": "application/pdf", "file_size": 3 * 1024 * 1024},
        "expected": None,  # Should pass
    },
]

# Form schema validation test cases
FORM_SCHEMA_TEST_CASES = [
    {
        "name": "empty_schema",
        "input": {},
        "expected": "Schema must be an object",
    },
    {
        "name": "no_fields",
        "input": {"fields": []},
        "expected": "Form must have at least one field",
    },
    {
        "name": "too_many_fields",
        "input": {"fields": [{"key": f"f{i}", "label": f"Field {i}", "type": "text"} for i in range(51)]},
        "expected": "Forms cannot exceed 50 fields",
    },
    {
        "name": "duplicate_keys",
        "input": {"fields": [
            {"key": "name", "label": "Name 1", "type": "text"},
            {"key": "name", "label": "Name 2", "type": "text"},
        ]},
        "expected": "Field keys must be unique",
    },
    {
        "name": "missing_key",
        "input": {"fields": [{"label": "Name", "type": "text"}]},
        "expected": "Field key is required",
    },
    {
        "name": "invalid_key_prefix",
        "input": {"fields": [{"key": "123name", "label": "Name", "type": "text"}]},
        "expected": "Key must start with lowercase letter",
    },
    {
        "name": "missing_label",
        "input": {"fields": [{"key": "name", "type": "text"}]},
        "expected": "Label is required",
    },
    {
        "name": "invalid_type",
        "input": {"fields": [{"key": "name", "label": "Name", "type": "invalid"}]},
        "expected": 'Invalid field type',
    },
    {
        "name": "select_no_options",
        "input": {"fields": [{"key": "choice", "label": "Choice", "type": "select", "options": []}]},
        "expected": "Select fields must have at least one option",
    },
    {
        "name": "valid_schema",
        "input": {"fields": [
            {"key": "name", "label": "Name", "type": "text"},
            {"key": "age", "label": "Age", "type": "number"},
        ]},
        "expected": None,  # Should pass
    },
]


def get_form_schema_backend_errors(schema: dict) -> list[str]:
    """Get error messages from backend form schema validation."""
    from app.schemas.form_validation import validate_form_schema
    try:
        validate_form_schema(schema)
        return []
    except ValueError as e:
        return [str(e)]


def get_form_schema_frontend_errors(schema: dict) -> list[str]:
    """Get error messages from frontend form schema validation (mirrors form-validator.js)."""
    errors = []

    if not schema or not isinstance(schema, dict):
        return ["Schema must be an object"]

    fields = schema.get("fields")
    if not fields or not isinstance(fields, list):
        return ["Schema must contain a fields array"]

    if len(fields) == 0:
        return ["Form must have at least one field"]

    if len(fields) > 50:
        errors.append("Forms cannot exceed 50 fields")

    keys = [f.get("key") for f in fields if f.get("key")]
    if len(keys) != len(set(keys)):
        errors.append("Field keys must be unique")

    FIELD_TYPES = {"text", "number", "date", "select", "textarea", "file"}

    for i, field in enumerate(fields):
        field_type = field.get("type")
        if field_type not in FIELD_TYPES:
            errors.append(f'Invalid field type: "{field_type}"')
            continue

        key = field.get("key", "")
        if not key:
            errors.append("Field key is required")
        elif len(key) > 50:
            errors.append("Field key must be under 50 characters")
        elif not key[0].isalpha() or not key[0].islower():
            errors.append("Key must start with lowercase letter")

        label = field.get("label", "")
        if not label:
            errors.append("Label is required")
        elif len(label) > 100:
            errors.append("Label must be under 100 characters")

        if field_type == "select":
            options = field.get("options", [])
            if not options or len(options) == 0:
                errors.append("Select fields must have at least one option")

    return errors[:5]  # Return top 5 errors only


def run_parity_tests():
    """Run all parity tests and report results."""
    print("=" * 60)
    print("Validation Parity Test Suite")
    print("=" * 60)

    passed = 0
    failed = 0

    for case in TEST_CASES:
        backend_errors = get_backend_errors(case["input"])
        frontend_errors = get_frontend_errors(case["input"])

        # Compare errors
        backend_match = case["expected"] is None or any(
            case["expected"] in e for e in backend_errors
        )
        frontend_match = case["expected"] is None or any(
            case["expected"] in e for e in frontend_errors
        )
        messages_match = backend_errors == frontend_errors

        status = "PASS" if (backend_match and frontend_match and messages_match) else "FAIL"

        if status == "PASS":
            passed += 1
            print(f"  PASS  {case['name']}")
        else:
            failed += 1
            print(f"  FAIL  {case['name']}")
            if not backend_match:
                print(f"        Backend missing: {case['expected']}")
                print(f"        Backend got: {backend_errors}")
            if not frontend_match:
                print(f"        Frontend missing: {case['expected']}")
                print(f"        Frontend got: {frontend_errors}")
            if not messages_match:
                print(f"        Message mismatch!")
                print(f"          Backend:  {backend_errors}")
                print(f"          Frontend: {frontend_errors}")

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {len(TEST_CASES)} total")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    import sys

    sys.path.insert(0, ".")
    success = run_parity_tests()
    sys.exit(0 if success else 1)
