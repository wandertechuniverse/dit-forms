import time
import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
from fastapi import HTTPException

from app.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
    timeout=30,
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
ALLOWED_FORMATS = ["jpg", "jpeg", "png", "pdf"]
MAX_SIZE = 5 * 1024 * 1024  # 5MB


async def upload_student_file(file_bytes: bytes, filename: str, student_id: str) -> dict:
    """Upload IC/document to Cloudinary with student-scoped folder."""
    name_part = filename.rsplit(".", 1)[0] if "." in filename else filename
    public_id = f"dit-forms/students/{student_id}/{name_part}"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            folder="dit-forms/students",
            resource_type="auto",
            overwrite=False,
            allowed_formats=ALLOWED_FORMATS,
            transformation=[{"quality": "auto", "fetch_format": "auto"}],
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "format": result["format"],
            "bytes": result["bytes"],
        }
    except cloudinary.exceptions.Error as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


async def upload_student_ic(file_bytes: bytes, filename: str, student_id: str) -> dict:
    """Upload IC with auto-crop and quality enforcement."""
    public_id = f"dit-forms/students/{student_id}/ic"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            public_id=public_id,
            folder="dit-forms/students",
            resource_type="image",
            overwrite=True,
            allowed_formats=["jpg", "jpeg", "png"],
            transformation=[
                {"gravity": "auto", "crop": "thumb", "width": 400, "height": 300},
                {"quality": "auto:good", "fetch_format": "auto"},
                {"effect": "sharpen:100"},
            ],
        )
        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "format": result["format"],
            "bytes": result["bytes"],
        }
    except cloudinary.exceptions.Error as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")


def generate_signed_download_url(public_id: str, expires_in: int = 3600) -> str:
    """Generate time-limited signed URL for secure document access."""
    url, _ = cloudinary_url(
        public_id,
        sign_url=True,
        type="authenticated",
        expires_at=int(time.time()) + expires_in,
    )
    return url


def get_public_url(public_id: str) -> str:
    """Get a regular (unsigned) URL for public resources."""
    url, _ = cloudinary_url(public_id, secure=True)
    return url
