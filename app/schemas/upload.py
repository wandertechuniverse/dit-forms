"""
Upload validation parity layer - mirrors frontend form-validator.js
Ensure identical error messages on client and server
"""
from fastapi import HTTPException


ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_upload_file(content_type: str, file_size: int) -> None:
    """
    Validate file upload. Raises HTTPException with messages
    that match frontend form-validator.js exactly.
    """
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Only JPG, PNG, or PDF allowed. Got {content_type}"
        )

    if file_size > MAX_FILE_SIZE:
        size_mb = round(file_size / 1024 / 1024, 1)
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb}MB). Max 5MB."
        )


def validate_student_id(student_id: str) -> None:
    """Validate student ID format. Matches frontend UUID validation."""
    import uuid
    try:
        uuid.UUID(student_id, version=4)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Valid Student ID (UUID v4) required"
        )
